"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviewSchema, fieldErrors } from "@/lib/validation";
import { limitByIp } from "@/lib/rate-limit";

export type ReviewState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

/**
 * Публикува ревю.
 *
 * Спецификацията изисква ревюта от потребители, закупили книгата. Разрешаваме
 * ревю на всеки регистриран потребител, но маркираме „Потвърдена покупка“ само
 * при реално платена поръчка — така новите посетители виждат кое ревю тежи.
 */
export async function submitReview(
  _prev: ReviewState,
  formData: FormData,
): Promise<ReviewState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, message: "Влезте в профила си, за да напишете ревю." };
  }

  const limit = await limitByIp("review", 5, 3600);
  if (!limit.ok) {
    return { ok: false, message: "Твърде много опити. Опитайте отново по-късно." };
  }

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { productId, rating, title, body } = parsed.data;
  const userId = session.user.id;

  const product = await db.product.findFirst({
    where: { id: productId, isPublished: true },
    select: { id: true, slug: true, type: true },
  });
  if (!product) return { ok: false, message: "Продуктът не е намерен." };

  // Потвърдена покупка = платена поръчка, съдържаща този продукт.
  const purchase = await db.orderItem.findFirst({
    where: {
      productId,
      order: {
        userId,
        status: { in: ["PAID", "SHIPPED", "COMPLETED"] },
      },
    },
    select: { id: true },
  });

  try {
    await db.review.upsert({
      where: { productId_userId: { productId, userId } },
      create: {
        productId,
        userId,
        rating,
        title: title || null,
        body,
        verifiedPurchase: Boolean(purchase),
      },
      update: {
        rating,
        title: title || null,
        body,
        verifiedPurchase: Boolean(purchase),
      },
    });
  } catch {
    return { ok: false, message: "Ревюто не можа да бъде запазено." };
  }

  const base =
    product.type === "PHYSICAL" ? "/knigi" : product.type === "PDF" ? "/pdf" : "/audio";
  revalidatePath(`${base}/${product.slug}`);

  return { ok: true, message: "Благодарим за ревюто!" };
}

export async function deleteOwnReview(reviewId: string): Promise<ReviewState> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, message: "Нямате достъп." };

  const review = await db.review.findUnique({
    where: { id: reviewId },
    select: { userId: true, product: { select: { slug: true, type: true } } },
  });

  if (!review || review.userId !== session.user.id) {
    return { ok: false, message: "Ревюто не е намерено." };
  }

  await db.review.delete({ where: { id: reviewId } });

  const base =
    review.product.type === "PHYSICAL"
      ? "/knigi"
      : review.product.type === "PDF"
        ? "/pdf"
        : "/audio";
  revalidatePath(`${base}/${review.product.slug}`);

  return { ok: true, message: "Ревюто е изтрито." };
}
