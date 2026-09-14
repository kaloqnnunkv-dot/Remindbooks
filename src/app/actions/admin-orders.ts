"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { orderStatusSchema, fieldErrors } from "@/lib/validation";
import { sendOrderShipped, sendOrderStatusUpdate } from "@/lib/email";
import type { AdminState } from "./admin-products";

const empty: AdminState = { ok: false, message: "" };

/**
 * Смяна на статуса на поръчка, по желание с имейл до клиента.
 *
 * При връщане на количествата (отказ/възстановяване) наличностите се
 * увеличават обратно — но само веднъж, ако поръчката е била платена.
 */
export async function updateOrderStatus(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const parsed = orderStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Невалидни данни.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { orderId, status, trackingNumber, notifyCustomer } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { select: { productId: true, quantity: true, typeSnapshot: true } } },
  });

  if (!order) return { ...empty, message: "Поръчката не е намерена." };
  if (order.status === status && !trackingNumber) {
    return { ok: true, message: "Няма промяна." };
  }

  const wasCounted = ["PAID", "SHIPPED", "COMPLETED"].includes(order.status);
  const willBeCancelled = status === "CANCELLED" || status === "REFUNDED";

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: {
        status,
        trackingNumber: trackingNumber || order.trackingNumber,
        shippedAt:
          status === "SHIPPED" && !order.shippedAt ? new Date() : order.shippedAt,
      },
    });

    // Връщаме бройките в склада при отказ на вече платена поръчка.
    if (wasCounted && willBeCancelled) {
      for (const item of order.items) {
        if (item.productId && item.typeSnapshot === "PHYSICAL") {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
    }
  });

  // Уведомяване на клиента. „Изпратена“ има собствен шаблон с номер за
  // проследяване; останалите статуси използват общия шаблон.
  if (notifyCustomer) {
    if (status === "SHIPPED") {
      await sendOrderShipped({
        orderNumber: order.orderNumber,
        email: order.email,
        firstName: order.firstName,
        trackingNumber: trackingNumber || order.trackingNumber,
      });
    } else {
      await sendOrderStatusUpdate({
        orderNumber: order.orderNumber,
        email: order.email,
        firstName: order.firstName,
        status,
        paymentMethod: order.paymentMethod,
      });
    }
  }

  revalidatePath("/admin/porachki");
  revalidatePath(`/admin/porachki/${orderId}`);
  revalidatePath("/admin");

  return {
    ok: true,
    message: notifyCustomer
      ? "Статусът е сменен и клиентът е уведомен."
      : "Статусът е сменен.",
  };
}

/** Ръчно отключване на дигитално съдържание за конкретен потребител. */
export async function grantEntitlement(
  userId: string,
  productId: string,
): Promise<AdminState> {
  await requireAdmin();

  const [user, product] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { id: true } }),
    db.product.findUnique({
      where: { id: productId },
      select: { id: true, type: true, title: true },
    }),
  ]);

  if (!user) return { ...empty, message: "Потребителят не е намерен." };
  if (!product) return { ...empty, message: "Продуктът не е намерен." };
  if (product.type === "PHYSICAL") {
    return { ...empty, message: "Физическите книги не се отключват." };
  }

  await db.entitlement.upsert({
    where: { userId_productId: { userId, productId } },
    create: { userId, productId, grantedManually: true },
    update: { grantedManually: true },
  });

  revalidatePath(`/admin/potrebiteli/${userId}`);
  return { ok: true, message: `„${product.title}“ е отключена за потребителя.` };
}

export async function revokeEntitlement(
  userId: string,
  productId: string,
): Promise<AdminState> {
  await requireAdmin();

  await db.entitlement.deleteMany({ where: { userId, productId } });

  revalidatePath(`/admin/potrebiteli/${userId}`);
  return { ok: true, message: "Достъпът е премахнат." };
}

// ------------------------------------------------------------------
// Съобщения и коментари
// ------------------------------------------------------------------

export async function markMessageRead(
  messageId: string,
  isRead: boolean,
): Promise<AdminState> {
  await requireAdmin();
  await db.contactMessage.update({ where: { id: messageId }, data: { isRead } });
  revalidatePath("/admin/sabshtenia");
  revalidatePath("/admin");
  return { ok: true, message: isRead ? "Отбелязано като прочетено." : "Отбелязано като непрочетено." };
}

export async function deleteMessage(messageId: string): Promise<AdminState> {
  await requireAdmin();
  await db.contactMessage.delete({ where: { id: messageId } });
  revalidatePath("/admin/sabshtenia");
  return { ok: true, message: "Съобщението е изтрито." };
}

export async function approveComment(
  commentId: string,
  approved: boolean,
): Promise<AdminState> {
  await requireAdmin();

  const comment = await db.comment.update({
    where: { id: commentId },
    data: { isApproved: approved },
    select: { post: { select: { slug: true } } },
  });

  revalidatePath("/admin/komentari");
  revalidatePath("/admin");
  revalidatePath(`/blog/${comment.post.slug}`);

  return { ok: true, message: approved ? "Коментарът е одобрен." : "Коментарът е скрит." };
}

export async function deleteComment(commentId: string): Promise<AdminState> {
  await requireAdmin();

  const comment = await db.comment.delete({
    where: { id: commentId },
    select: { post: { select: { slug: true } } },
  });

  revalidatePath("/admin/komentari");
  revalidatePath(`/blog/${comment.post.slug}`);
  return { ok: true, message: "Коментарът е изтрит." };
}

export async function deleteReview(reviewId: string): Promise<AdminState> {
  await requireAdmin();
  await db.review.delete({ where: { id: reviewId } });
  revalidatePath("/admin");
  return { ok: true, message: "Ревюто е изтрито." };
}

/**
 * Изтриване на поръчка.
 *
 * Служи за чистене на пробни и сгрешени записи. Истинска поръчка по-скоро се
 * отказва или възстановява — историята трябва да остане за счетоводството.
 *
 * Изтриването не е само `DELETE`: при плащането поръчката е местила няколко
 * числа настрани от себе си и те трябва да се върнат, иначе остават криви
 * завинаги. `paidAt` е точният белег, че `fulfillOrder` е минал — записва се в
 * същата транзакция, която прави отчитането.
 *
 *   наличност    връща се само ако поръчката още се брои за платена. Отказана
 *                поръчка вече си е върнала бройките при смяната на статуса и
 *                второ връщане би раздуло склада.
 *   промо код    броячът на използванията се смъква с едно.
 *   карта        удържаната стойност се връща и картата пак става активна.
 *   достъпи      махат се, освен ако не са дадени ръчно или същата книга не е
 *                платена и с друга поръчка.
 *
 * Редовете на поръчката си отиват сами — връзката е с каскада.
 */
export async function deleteOrder(orderId: string): Promise<AdminState> {
  await requireAdmin();

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paidAt: true,
      userId: true,
      promoCodeId: true,
      giftCardId: true,
      giftCardCents: true,
      items: { select: { productId: true, quantity: true, typeSnapshot: true } },
      entitlements: {
        select: { id: true, productId: true, grantedManually: true },
      },
    },
  });

  if (!order) return { ...empty, message: "Поръчката не е намерена." };

  // Какво точно е било пипнато — влиза в съобщението, за да се вижда че
  // изтриването не е минало безследно.
  const undone: string[] = [];

  await db.$transaction(async (tx) => {
    const stillCounted = ["PAID", "SHIPPED", "COMPLETED"].includes(order.status);

    if (order.paidAt && stillCounted) {
      let returned = 0;
      for (const item of order.items) {
        if (item.productId && item.typeSnapshot === "PHYSICAL") {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
          returned += item.quantity;
        }
      }
      if (returned > 0) undone.push(`${returned} бр. върнати в наличност`);
    }

    if (order.paidAt && order.promoCodeId) {
      // Броячът не бива да падне под нула, ако някой вече го е пипал на ръка.
      const promo = await tx.promoCode.findUnique({
        where: { id: order.promoCodeId },
        select: { usedCount: true },
      });
      if (promo && promo.usedCount > 0) {
        await tx.promoCode.update({
          where: { id: order.promoCodeId },
          data: { usedCount: promo.usedCount - 1 },
        });
        undone.push("промо кодът е с едно използване по-малко");
      }
    }

    if (order.paidAt && order.giftCardId && order.giftCardCents > 0) {
      await tx.giftCard.update({
        where: { id: order.giftCardId },
        data: {
          balanceCents: { increment: order.giftCardCents },
          status: "ACTIVE",
        },
      });
      undone.push("стойността на подаръчната карта е върната");
    }

    let revoked = 0;
    for (const ent of order.entitlements) {
      // Ръчно отключеното е решение на администратор и не зависи от поръчката.
      if (ent.grantedManually) continue;

      // Същата книга може да е платена и с друга поръчка — записът за достъп е
      // само един на потребител и продукт, тъй че не бива да се маха.
      const alsoElsewhere = await tx.orderItem.count({
        where: {
          productId: ent.productId,
          orderId: { not: order.id },
          order: { userId: order.userId, paidAt: { not: null } },
        },
      });
      if (alsoElsewhere > 0) continue;

      await tx.entitlement.delete({ where: { id: ent.id } });
      revoked++;
    }
    if (revoked > 0) {
      undone.push(`${revoked} ${revoked === 1 ? "достъп е отнет" : "достъпа са отнети"}`);
    }

    await tx.order.delete({ where: { id: order.id } });
  });

  revalidatePath("/admin/porachki");
  revalidatePath("/admin");

  return {
    ok: true,
    message: undone.length
      ? `Поръчка ${order.orderNumber} е изтрита (${undone.join("; ")}).`
      : `Поръчка ${order.orderNumber} е изтрита.`,
  };
}
