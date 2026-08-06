"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env, isStripeConfigured } from "@/lib/env";
import { requireStripe } from "@/lib/stripe";
import { getDetailedCart, clearCart } from "@/lib/cart";
import { computeTotals, validatePromo } from "@/lib/pricing";
import { createPendingOrder, fulfillOrder } from "@/lib/orders";
import { shippingSchema, fieldErrors } from "@/lib/validation";
import { limitByIp } from "@/lib/rate-limit";

export type CheckoutState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

const empty: CheckoutState = { ok: false, message: "" };

// ------------------------------------------------------------------
// Проверка на промо код (на живо в checkout формата)
// ------------------------------------------------------------------

export type PromoCheckResult = {
  ok: boolean;
  message: string;
  discountCents: number;
  code?: string;
};

export async function checkPromoCode(code: string): Promise<PromoCheckResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { ok: false, message: "Въведете промо код.", discountCents: 0 };
  }

  const limit = await limitByIp("promo-check", 20, 300);
  if (!limit.ok) {
    return { ok: false, message: "Твърде много опити.", discountCents: 0 };
  }

  const lines = await getDetailedCart();
  if (lines.length === 0) {
    return { ok: false, message: "Кошницата е празна.", discountCents: 0 };
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);
  const promo = await db.promoCode.findUnique({ where: { code: trimmed } });
  const result = validatePromo(promo, subtotal);

  if (!result.ok) {
    return { ok: false, message: result.reason, discountCents: 0 };
  }

  return {
    ok: true,
    message: `Кодът е приложен: −${(result.discountCents / 100).toFixed(2)} лв.`,
    discountCents: result.discountCents,
    code: trimmed,
  };
}

export type GiftCardCheckResult = {
  ok: boolean;
  message: string;
  balanceCents: number;
  code?: string;
};

export async function checkGiftCard(code: string): Promise<GiftCardCheckResult> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    return { ok: false, message: "Въведете код на карта.", balanceCents: 0 };
  }

  const limit = await limitByIp("giftcard-check", 20, 300);
  if (!limit.ok) {
    return { ok: false, message: "Твърде много опити.", balanceCents: 0 };
  }

  const card = await db.giftCard.findUnique({ where: { code: trimmed } });

  if (!card) {
    return { ok: false, message: "Невалиден код на подаръчна карта.", balanceCents: 0 };
  }
  if (card.status !== "ACTIVE" || card.balanceCents <= 0) {
    return { ok: false, message: "Тази карта вече е използвана.", balanceCents: 0 };
  }
  if (card.expiresAt && card.expiresAt < new Date()) {
    return { ok: false, message: "Срокът на картата е изтекъл.", balanceCents: 0 };
  }

  return {
    ok: true,
    message: `Налична стойност: ${(card.balanceCents / 100).toFixed(2)} лв.`,
    balanceCents: card.balanceCents,
    code: trimmed,
  };
}

// ------------------------------------------------------------------
// Основен checkout
// ------------------------------------------------------------------

/**
 * Обработва поръчка с физически книги (изисква адрес за доставка).
 *
 * Всички суми се преизчисляват на сървъра от текущите цени в базата —
 * стойностите от формата се използват само за адреса и избора на плащане.
 */
export async function submitCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const limit = await limitByIp("checkout", 15, 600);
  if (!limit.ok) {
    return { ...empty, message: "Твърде много опити. Моля, изчакайте малко." };
  }

  const parsed = shippingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  if (data.paymentMethod === "COD" && !env.features.cod) {
    return { ...empty, message: "Наложеният платеж не е наличен." };
  }
  if (data.paymentMethod === "CARD" && !isStripeConfigured) {
    return { ...empty, message: "Плащането с карта в момента не е налично." };
  }

  const lines = await getDetailedCart();
  if (lines.length === 0) {
    return { ...empty, message: "Кошницата е празна." };
  }

  // Проверка на наличностите непосредствено преди създаване на поръчката.
  for (const line of lines) {
    if (line.unavailable) {
      return {
        ...empty,
        message: `„${line.title}“ вече не е налична. Моля, премахнете я от кошницата.`,
      };
    }
    if (line.type === "PHYSICAL" && line.quantity > line.stock) {
      return {
        ...empty,
        message: `От „${line.title}“ са налични само ${line.stock} бр.`,
      };
    }
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);

  // Промо код
  let promoId: string | null = null;
  let discountCents = 0;
  if (data.promoCode) {
    const promo = await db.promoCode.findUnique({
      where: { code: data.promoCode.trim().toUpperCase() },
    });
    const result = validatePromo(promo, subtotal);
    if (!result.ok) {
      return { ok: false, message: result.reason, errors: { promoCode: result.reason } };
    }
    promoId = result.promo.id;
    discountCents = result.discountCents;
  }

  // Подаръчна карта
  let giftCardId: string | null = null;
  let giftCardBalance = 0;
  if (data.giftCardCode && env.features.giftCards) {
    const card = await db.giftCard.findUnique({
      where: { code: data.giftCardCode.trim().toUpperCase() },
    });
    if (
      card &&
      card.status === "ACTIVE" &&
      card.balanceCents > 0 &&
      (!card.expiresAt || card.expiresAt > new Date())
    ) {
      giftCardId = card.id;
      giftCardBalance = card.balanceCents;
    } else {
      return {
        ok: false,
        message: "Невалидна подаръчна карта.",
        errors: { giftCardCode: "Невалидна или изчерпана карта." },
      };
    }
  }

  const totals = computeTotals(lines, {
    discountCents,
    giftCardBalanceCents: giftCardBalance,
    paymentMethod: data.paymentMethod,
  });

  const session = await auth();

  const order = await createPendingOrder({
    email: data.email,
    userId: session?.user?.id ?? null,
    firstName: data.firstName,
    lastName: data.lastName,
    phone: data.phone,
    addressLine: data.addressLine,
    city: data.city,
    postalCode: data.postalCode,
    notes: data.notes ?? null,
    paymentMethod: data.paymentMethod,
    fulfillmentType: totals.requiresShipping ? "SHIPPING" : "DIGITAL",
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    shippingCents: totals.shippingCents,
    totalCents: totals.totalCents,
    promoCodeId: promoId,
    giftCardId,
    giftCardCents: totals.giftCardCents,
    items: lines.map((l) => ({
      productId: l.productId,
      bundleId: l.bundleId,
      titleSnapshot: l.title,
      typeSnapshot: l.type,
      unitCents: l.unitCents,
      quantity: l.quantity,
    })),
  });

  // Наложен платеж: поръчката се потвърждава веднага, без Stripe.
  if (data.paymentMethod === "COD") {
    await fulfillOrder(order.id);
    await clearCart();
    redirect(`/checkout/uspeh?order=${order.orderNumber}`);
  }

  // Подаръчната карта може да покрие цялата сума — тогава няма какво да се плаща.
  if (totals.totalCents === 0) {
    await fulfillOrder(order.id);
    await clearCart();
    redirect(`/checkout/uspeh?order=${order.orderNumber}`);
  }

  const checkoutUrl = await createStripeSession({
    orderId: order.id,
    orderNumber: order.orderNumber,
    email: data.email,
    totalCents: totals.totalCents,
    lines: lines.map((l) => ({ title: l.title, unitCents: l.unitCents, quantity: l.quantity })),
    shippingCents: totals.shippingCents,
    discountCents: totals.discountCents + totals.giftCardCents,
  });

  if (!checkoutUrl) {
    return { ...empty, message: "Плащането не можа да бъде стартирано. Опитайте отново." };
  }

  redirect(checkoutUrl);
}

/**
 * Бърз checkout само за дигитални продукти — Stripe събира имейл и карта,
 * без формуляр за адрес. Спецификацията изисква този опростен флоу.
 */
export async function submitDigitalCheckout(
  _prev: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const limit = await limitByIp("checkout-digital", 15, 600);
  if (!limit.ok) {
    return { ...empty, message: "Твърде много опити. Моля, изчакайте малко." };
  }

  if (!isStripeConfigured) {
    return { ...empty, message: "Плащането с карта в момента не е налично." };
  }

  const email = formData.get("email")?.toString().trim().toLowerCase() ?? "";
  const promoCode = formData.get("promoCode")?.toString().trim() ?? "";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return {
      ok: false,
      message: "Моля, въведете валиден имейл адрес.",
      errors: { email: "Невалиден имейл адрес." },
    };
  }

  const lines = await getDetailedCart();
  if (lines.length === 0) return { ...empty, message: "Кошницата е празна." };

  if (lines.some((l) => l.type === "PHYSICAL")) {
    return {
      ...empty,
      message: "Кошницата съдържа физически книги — използвайте пълната форма.",
    };
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);

  let promoId: string | null = null;
  let discountCents = 0;
  if (promoCode) {
    const promo = await db.promoCode.findUnique({
      where: { code: promoCode.toUpperCase() },
    });
    const result = validatePromo(promo, subtotal);
    if (!result.ok) {
      return { ok: false, message: result.reason, errors: { promoCode: result.reason } };
    }
    promoId = result.promo.id;
    discountCents = result.discountCents;
  }

  const totals = computeTotals(lines, { discountCents });
  const session = await auth();

  const order = await createPendingOrder({
    email,
    userId: session?.user?.id ?? null,
    paymentMethod: "CARD",
    fulfillmentType: "DIGITAL",
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    shippingCents: 0,
    totalCents: totals.totalCents,
    promoCodeId: promoId,
    items: lines.map((l) => ({
      productId: l.productId,
      bundleId: l.bundleId,
      titleSnapshot: l.title,
      typeSnapshot: l.type,
      unitCents: l.unitCents,
      quantity: l.quantity,
    })),
  });

  if (totals.totalCents === 0) {
    await fulfillOrder(order.id);
    await clearCart();
    redirect(`/checkout/uspeh?order=${order.orderNumber}`);
  }

  const checkoutUrl = await createStripeSession({
    orderId: order.id,
    orderNumber: order.orderNumber,
    email,
    totalCents: totals.totalCents,
    lines: lines.map((l) => ({ title: l.title, unitCents: l.unitCents, quantity: l.quantity })),
    shippingCents: 0,
    discountCents: totals.discountCents,
  });

  if (!checkoutUrl) {
    return { ...empty, message: "Плащането не можа да бъде стартирано." };
  }

  redirect(checkoutUrl);
}

// ------------------------------------------------------------------
// Stripe сесия
// ------------------------------------------------------------------

async function createStripeSession(input: {
  orderId: string;
  orderNumber: string;
  email: string;
  totalCents: number;
  lines: { title: string; unitCents: number; quantity: number }[];
  shippingCents: number;
  discountCents: number;
}): Promise<string | null> {
  try {
    const stripe = requireStripe();

    // Отстъпките се прилагат пропорционално върху една обобщена позиция, за да
    // може сумата в Stripe да съвпадне точно с изчислената от нас.
    const lineItems = input.discountCents > 0
      ? [
          {
            price_data: {
              currency: env.shop.currency,
              product_data: {
                name: `Поръчка ${input.orderNumber}`,
                description: input.lines
                  .map((l) => `${l.title}${l.quantity > 1 ? ` ×${l.quantity}` : ""}`)
                  .join(", ")
                  .slice(0, 500),
              },
              unit_amount: input.totalCents,
            },
            quantity: 1,
          },
        ]
      : [
          ...input.lines.map((l) => ({
            price_data: {
              currency: env.shop.currency,
              product_data: { name: l.title.slice(0, 250) },
              unit_amount: l.unitCents,
            },
            quantity: l.quantity,
          })),
          ...(input.shippingCents > 0
            ? [
                {
                  price_data: {
                    currency: env.shop.currency,
                    product_data: { name: "Доставка" },
                    unit_amount: input.shippingCents,
                  },
                  quantity: 1,
                },
              ]
            : []),
        ];

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: input.email,
      line_items: lineItems,
      locale: "bg",
      client_reference_id: input.orderId,
      metadata: { orderId: input.orderId, orderNumber: input.orderNumber },
      success_url: `${env.appUrl}/checkout/uspeh?order=${input.orderNumber}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.appUrl}/kolichka?cancelled=1`,
      // Сесията изтича след 30 минути — освобождава резервираните бройки.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    await db.order.update({
      where: { id: input.orderId },
      data: { stripeSessionId: checkoutSession.id },
    });

    return checkoutSession.url;
  } catch (err) {
    console.error("[stripe] Създаването на сесия се провали:", err);
    return null;
  }
}
