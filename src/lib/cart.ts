import "server-only";
import { cookies } from "next/headers";
import { db } from "./db";
import type { PricedLine } from "./pricing";

/**
 * Кошницата се пази в cookie (без база данни), защото:
 *  - работи за гости без регистрация, каквото изисква спецификацията;
 *  - не изисква чистене на изоставени кошници;
 *  - оцелява при рестарт на сървъра.
 *
 * В cookie-то се пазят САМО идентификатори и количества. Цените винаги се четат
 * от базата при изчисление — така промяна на цената не може да бъде подправена
 * от клиента.
 */

const COOKIE_NAME = "rmb_cart";
const MAX_QUANTITY = 20;

export type CartItem = {
  /** Идентификатор на продукт (p) или комплект (b). */
  id: string;
  kind: "p" | "b";
  qty: number;
};

export async function readCart(): Promise<CartItem[]> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (i): i is CartItem =>
          typeof i?.id === "string" &&
          (i.kind === "p" || i.kind === "b") &&
          Number.isInteger(i.qty) &&
          i.qty > 0,
      )
      .slice(0, 50)
      .map((i) => ({ ...i, qty: Math.min(i.qty, MAX_QUANTITY) }));
  } catch {
    return [];
  }
}

export async function writeCart(items: CartItem[]): Promise<void> {
  const store = await cookies();
  if (items.length === 0) {
    store.delete(COOKIE_NAME);
    return;
  }
  store.set(COOKIE_NAME, JSON.stringify(items), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCart(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export type DetailedCartLine = PricedLine & {
  slug: string;
  coverImage: string | null;
  stock: number;
  maxQuantity: number;
  /** Дигиталните продукти се купуват само по 1 брой. */
  isDigital: boolean;
  /** Артикулът е недостъпен (изтрит, скрит или изчерпан). */
  unavailable?: string;
};

/**
 * Зарежда пълните данни за кошницата от базата.
 * Тук се прилагат и правилата за наличност — количество над наличното се реже.
 */
export async function getDetailedCart(): Promise<DetailedCartLine[]> {
  const items = await readCart();
  if (items.length === 0) return [];

  const productIds = items.filter((i) => i.kind === "p").map((i) => i.id);
  const bundleIds = items.filter((i) => i.kind === "b").map((i) => i.id);

  const [products, bundles] = await Promise.all([
    productIds.length
      ? db.product.findMany({
          where: { id: { in: productIds }, isPublished: true },
          select: {
            id: true, slug: true, title: true, type: true, priceCents: true,
            coverImage: true, stock: true, isFree: true,
          },
        })
      : Promise.resolve([]),
    bundleIds.length
      ? db.bundle.findMany({
          where: { id: { in: bundleIds }, isPublished: true },
          select: { id: true, slug: true, title: true, priceCents: true, coverImage: true },
        })
      : Promise.resolve([]),
  ]);

  const lines: DetailedCartLine[] = [];

  for (const item of items) {
    if (item.kind === "p") {
      const p = products.find((x) => x.id === item.id);
      if (!p) continue; // продуктът е изтрит или скрит — тихо отпада

      const isDigital = p.type === "PDF" || p.type === "AUDIO";
      const maxQuantity = isDigital ? 1 : Math.min(p.stock, MAX_QUANTITY);
      const qty = Math.max(1, Math.min(item.qty, maxQuantity || 1));

      lines.push({
        productId: p.id,
        slug: p.slug,
        title: p.title,
        type: p.type,
        unitCents: p.isFree ? 0 : p.priceCents,
        quantity: qty,
        coverImage: p.coverImage,
        stock: p.stock,
        maxQuantity,
        isDigital,
        unavailable:
          p.type === "PHYSICAL" && p.stock <= 0 ? "Изчерпана наличност" : undefined,
      });
    } else {
      const b = bundles.find((x) => x.id === item.id);
      if (!b) continue;
      lines.push({
        bundleId: b.id,
        slug: b.slug,
        title: b.title,
        type: "PHYSICAL",
        unitCents: b.priceCents,
        quantity: Math.max(1, Math.min(item.qty, MAX_QUANTITY)),
        coverImage: b.coverImage,
        stock: 99,
        maxQuantity: MAX_QUANTITY,
        isDigital: false,
      });
    }
  }

  return lines;
}

export async function cartCount(): Promise<number> {
  const items = await readCart();
  return items.reduce((n, i) => n + i.qty, 0);
}
