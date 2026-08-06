"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { readCart, writeCart, clearCart, type CartItem } from "@/lib/cart";

export type ActionResult = { ok: boolean; message: string };

/**
 * Добавя продукт в кошницата.
 *
 * Правила, наложени тук (а не в клиента), защото на клиента не се вярва:
 *  - дигиталните продукти (PDF/аудио) се купуват само по 1 брой;
 *  - физическите не могат да надвишат наличното количество;
 *  - скрит или несъществуващ продукт не влиза в кошницата.
 */
export async function addToCart(
  productId: string,
  quantity = 1,
): Promise<ActionResult> {
  const product = await db.product.findFirst({
    where: { id: productId, isPublished: true },
    select: { id: true, type: true, stock: true, title: true, isFree: true },
  });

  if (!product) {
    return { ok: false, message: "Продуктът не е намерен." };
  }

  const isDigital = product.type === "PDF" || product.type === "AUDIO";

  if (product.type === "PHYSICAL" && product.stock <= 0) {
    return { ok: false, message: "Този продукт е изчерпан." };
  }

  const cart = await readCart();
  const existing = cart.find((i) => i.id === productId && i.kind === "p");

  if (isDigital) {
    if (existing) {
      return { ok: false, message: "Този продукт вече е в кошницата." };
    }
    cart.push({ id: productId, kind: "p", qty: 1 });
  } else {
    const desired = (existing?.qty ?? 0) + Math.max(1, quantity);
    if (desired > product.stock) {
      return {
        ok: false,
        message: `Налични са само ${product.stock} бр.`,
      };
    }
    if (existing) existing.qty = desired;
    else cart.push({ id: productId, kind: "p", qty: desired });
  }

  await writeCart(cart);
  revalidatePath("/kolichka");
  revalidatePath("/", "layout");

  return { ok: true, message: `„${product.title}“ е добавена в кошницата.` };
}

export async function addBundleToCart(bundleId: string): Promise<ActionResult> {
  const bundle = await db.bundle.findFirst({
    where: { id: bundleId, isPublished: true },
    select: { id: true, title: true },
  });
  if (!bundle) return { ok: false, message: "Комплектът не е намерен." };

  const cart = await readCart();
  const existing = cart.find((i) => i.id === bundleId && i.kind === "b");
  if (existing) existing.qty += 1;
  else cart.push({ id: bundleId, kind: "b", qty: 1 });

  await writeCart(cart);
  revalidatePath("/kolichka");
  revalidatePath("/", "layout");
  return { ok: true, message: `„${bundle.title}“ е добавен в кошницата.` };
}

export async function updateCartQuantity(
  id: string,
  kind: "p" | "b",
  quantity: number,
): Promise<ActionResult> {
  const cart = await readCart();
  const item = cart.find((i) => i.id === id && i.kind === kind);
  if (!item) return { ok: false, message: "Артикулът не е в кошницата." };

  if (quantity <= 0) {
    return removeFromCart(id, kind);
  }

  if (kind === "p") {
    const product = await db.product.findUnique({
      where: { id },
      select: { type: true, stock: true },
    });
    if (!product) return { ok: false, message: "Продуктът не е намерен." };

    if (product.type === "PDF" || product.type === "AUDIO") {
      item.qty = 1;
    } else if (quantity > product.stock) {
      return { ok: false, message: `Налични са само ${product.stock} бр.` };
    } else {
      item.qty = quantity;
    }
  } else {
    item.qty = Math.min(quantity, 20);
  }

  await writeCart(cart);
  revalidatePath("/kolichka");
  revalidatePath("/", "layout");
  return { ok: true, message: "Количеството е обновено." };
}

export async function removeFromCart(
  id: string,
  kind: "p" | "b" = "p",
): Promise<ActionResult> {
  const cart = await readCart();
  const next: CartItem[] = cart.filter((i) => !(i.id === id && i.kind === kind));
  await writeCart(next);
  revalidatePath("/kolichka");
  revalidatePath("/", "layout");
  return { ok: true, message: "Артикулът е премахнат." };
}

export async function emptyCart(): Promise<ActionResult> {
  await clearCart();
  revalidatePath("/kolichka");
  revalidatePath("/", "layout");
  return { ok: true, message: "Кошницата е изпразнена." };
}
