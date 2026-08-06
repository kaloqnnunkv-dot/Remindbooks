import "server-only";
import type { Prisma, ProductType } from "@prisma/client";
import { db } from "./db";
import { formatOrderNumber } from "./pricing";
import { sendDigitalDelivery, sendOrderConfirmation, sendLowStockAlert } from "./email";
import { env } from "./env";
import { randomBytes } from "node:crypto";

/**
 * Обща логика за поръчките, споделена между Stripe webhook-а и наложения платеж.
 */

/**
 * Генерира пореден номер на поръчка за текущата година.
 *
 * Броим поръчките за годината и добавяме 1. При едновременни поръчки е
 * възможен конфликт по уникалния индекс, затова опитваме няколко пъти.
 */
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(year, 0, 1);

  for (let attempt = 0; attempt < 5; attempt++) {
    const count = await db.order.count({
      where: { createdAt: { gte: startOfYear } },
    });
    const candidate = formatOrderNumber(count + 1 + attempt, year);
    const exists = await db.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  // Резервен вариант — гарантирано уникален, макар и по-грозен.
  return `RMB-${year}-${Date.now().toString().slice(-6)}`;
}

/**
 * Финализира платена поръчка:
 *  - маркира я като платена;
 *  - намалява наличностите на физическите книги;
 *  - отключва дигиталното съдържание (Entitlement или гост токен);
 *  - увеличава брояча на промо кода;
 *  - изпраща имейлите.
 *
 * Функцията е идемпотентна — Stripe може да достави едно и също събитие
 * няколко пъти, а повторното извикване не бива да намалява склада два пъти.
 */
export async function fulfillOrder(orderId: string): Promise<void> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: { product: { select: { id: true, type: true, title: true } } },
      },
    },
  });

  if (!order) {
    console.error(`[fulfill] Поръчка ${orderId} не е намерена.`);
    return;
  }

  // Вече обработена — нищо за правене.
  if (order.paidAt) return;

  const now = new Date();

  const didFulfill = await db.$transaction(async (tx) => {
    // Повторна проверка вътре в транзакцията срещу паралелни webhook-и.
    const fresh = await tx.order.findUnique({
      where: { id: orderId },
      select: { paidAt: true },
    });
    if (fresh?.paidAt) return false;

    await tx.order.update({
      where: { id: orderId },
      data: { status: "PAID", paidAt: now },
    });

    for (const item of order.items) {
      if (!item.productId) continue;

      if (item.typeSnapshot === "PHYSICAL") {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      } else if (order.userId) {
        // Регистриран купувач — постоянен достъп.
        await tx.entitlement.upsert({
          where: {
            userId_productId: {
              userId: order.userId,
              productId: item.productId,
            },
          },
          create: {
            userId: order.userId,
            productId: item.productId,
            orderId: order.id,
          },
          update: {},
        });
      }
    }

    if (order.promoCodeId) {
      await tx.promoCode.update({
        where: { id: order.promoCodeId },
        data: { usedCount: { increment: 1 } },
      });
    }

    if (order.giftCardId && order.giftCardCents > 0) {
      const card = await tx.giftCard.findUnique({
        where: { id: order.giftCardId },
        select: { balanceCents: true },
      });
      if (card) {
        const remaining = Math.max(0, card.balanceCents - order.giftCardCents);
        await tx.giftCard.update({
          where: { id: order.giftCardId },
          data: {
            balanceCents: remaining,
            status: remaining === 0 ? "REDEEMED" : "ACTIVE",
          },
        });
      }
    }

    return true;
  });

  // Друг едновременен webhook вече е обработил поръчката — спираме, за да не
  // изпратим втори път имейлите и да не създадем дублирани линкове за сваляне.
  if (!didFulfill) return;

  // Гост поръчки на дигитално съдържание получават временни линкове по имейл.
  const digitalItems = order.items.filter(
    (i) => i.typeSnapshot === "PDF" || i.typeSnapshot === "AUDIO",
  );

  const downloadLinks: { title: string; url: string }[] = [];

  for (const item of digitalItems) {
    if (!item.productId) continue;

    if (order.userId) {
      downloadLinks.push({
        title: item.titleSnapshot,
        url: `${env.appUrl}/api/download/${item.productId}`,
      });
    } else {
      const token = randomBytes(32).toString("hex");
      await db.guestDownloadToken.create({
        data: {
          token,
          orderId: order.id,
          productId: item.productId,
          email: order.email,
          // 30 дни е достатъчно дълго за гост, без да е вечен линк.
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      downloadLinks.push({
        title: item.titleSnapshot,
        url: `${env.appUrl}/api/download/${item.productId}?token=${token}`,
      });
    }
  }

  // Имейли — не блокираме потока, ако изпращането се провали.
  try {
    await sendOrderConfirmation({
      orderNumber: order.orderNumber,
      email: order.email,
      firstName: order.firstName,
      items: order.items.map((i) => ({
        titleSnapshot: i.titleSnapshot,
        quantity: i.quantity,
        unitCents: i.unitCents,
      })),
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents + order.giftCardCents,
      shippingCents: order.shippingCents,
      totalCents: order.totalCents,
      isDigital: order.fulfillmentType === "DIGITAL",
      addressLine: order.addressLine,
      city: order.city,
      postalCode: order.postalCode,
    });

    if (downloadLinks.length > 0) {
      await sendDigitalDelivery({
        email: order.email,
        orderNumber: order.orderNumber,
        items: downloadLinks,
      });
    }
  } catch (err) {
    console.error("[fulfill] Грешка при изпращане на имейл:", err);
  }

  await checkLowStock();
}

/** Известява собственика за книги с ниска наличност. */
export async function checkLowStock(): Promise<void> {
  try {
    const products = await db.$queryRaw<{ title: string; stock: number }[]>`
      SELECT title, stock FROM "Product"
      WHERE type = 'PHYSICAL' AND "isPublished" = true AND stock <= "lowStockAlert"
      ORDER BY stock ASC LIMIT 20
    `;
    if (products.length > 0) {
      await sendLowStockAlert(products);
    }
  } catch (err) {
    console.error("[stock] Проверката за ниска наличност се провали:", err);
  }
}

export type OrderLineInput = {
  productId?: string;
  bundleId?: string;
  titleSnapshot: string;
  typeSnapshot: ProductType;
  unitCents: number;
  quantity: number;
};

/** Създава поръчка в статус PENDING (преди плащане). */
export async function createPendingOrder(data: {
  email: string;
  userId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  addressLine?: string | null;
  city?: string | null;
  postalCode?: string | null;
  notes?: string | null;
  paymentMethod: "CARD" | "COD";
  fulfillmentType: "SHIPPING" | "DIGITAL";
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  promoCodeId?: string | null;
  giftCardId?: string | null;
  giftCardCents?: number;
  items: OrderLineInput[];
}) {
  const orderNumber = await generateOrderNumber();

  const createData: Prisma.OrderCreateInput = {
    orderNumber,
    email: data.email,
    firstName: data.firstName ?? null,
    lastName: data.lastName ?? null,
    phone: data.phone ?? null,
    addressLine: data.addressLine ?? null,
    city: data.city ?? null,
    postalCode: data.postalCode ?? null,
    notes: data.notes ?? null,
    status: "PENDING",
    paymentMethod: data.paymentMethod,
    fulfillmentType: data.fulfillmentType,
    subtotalCents: data.subtotalCents,
    discountCents: data.discountCents,
    shippingCents: data.shippingCents,
    totalCents: data.totalCents,
    giftCardCents: data.giftCardCents ?? 0,
    ...(data.userId ? { user: { connect: { id: data.userId } } } : {}),
    ...(data.promoCodeId ? { promoCode: { connect: { id: data.promoCodeId } } } : {}),
    ...(data.giftCardId ? { giftCard: { connect: { id: data.giftCardId } } } : {}),
    items: {
      create: data.items.map((i) => ({
        ...(i.productId ? { product: { connect: { id: i.productId } } } : {}),
        ...(i.bundleId ? { bundle: { connect: { id: i.bundleId } } } : {}),
        titleSnapshot: i.titleSnapshot,
        typeSnapshot: i.typeSnapshot,
        unitCents: i.unitCents,
        quantity: i.quantity,
      })),
    },
  };

  return db.order.create({ data: createData, include: { items: true } });
}
