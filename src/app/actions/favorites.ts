"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export type FavoriteResult = {
  ok: boolean;
  isFavorite: boolean;
  message: string;
  requiresLogin?: boolean;
};

/**
 * Превключва "любими" за продукт.
 * Достъпно само за регистрирани потребители — така изисква спецификацията.
 */
export async function toggleFavorite(productId: string): Promise<FavoriteResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      isFavorite: false,
      requiresLogin: true,
      message: "Влезте в профила си, за да запазвате любими.",
    };
  }

  const userId = session.user.id;

  const existing = await db.favorite.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { id: true },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    revalidatePath("/profil/lyubimi");
    return { ok: true, isFavorite: false, message: "Премахната от любими." };
  }

  const product = await db.product.findFirst({
    where: { id: productId, isPublished: true },
    select: { id: true },
  });
  if (!product) {
    return { ok: false, isFavorite: false, message: "Продуктът не е намерен." };
  }

  await db.favorite.create({ data: { userId, productId } });
  revalidatePath("/profil/lyubimi");
  return { ok: true, isFavorite: true, message: "Добавена в любими." };
}

/** Връща множеството от ID-та на любимите продукти — за списъчните страници. */
export async function getFavoriteIds(): Promise<Set<string>> {
  const session = await auth();
  if (!session?.user?.id) return new Set();

  const favorites = await db.favorite.findMany({
    where: { userId: session.user.id },
    select: { productId: true },
  });
  return new Set(favorites.map((f) => f.productId));
}
