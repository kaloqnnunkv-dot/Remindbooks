import "server-only";
import type { Prisma, ProductType } from "@prisma/client";
import { orderByFor, type SortOption } from "./catalog";
import { db } from "./db";
import { publicUrl } from "./storage";
import type { ProductCardData } from "@/components/product-card";

/**
 * Заявки за четене, споделени между страниците.
 * Тук се прави и превръщането на ключове от хранилището в публични URL-и,
 * за да не се повтаря във всяка страница.
 */

const CARD_SELECT = {
  id: true,
  slug: true,
  title: true,
  author: true,
  type: true,
  priceCents: true,
  compareAtCents: true,
  coverImage: true,
  stock: true,
  isFree: true,
  isBestseller: true,
  isFeatured: true,
  durationSeconds: true,
} satisfies Prisma.ProductSelect;

type RawCard = Prisma.ProductGetPayload<{ select: typeof CARD_SELECT }> & {
  reviews?: { rating: number }[];
  _count?: { reviews: number };
};

export function toCardData(p: RawCard): ProductCardData {
  const ratings = p.reviews?.map((r) => r.rating) ?? [];
  const avg =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    author: p.author,
    type: p.type,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    coverImage: publicUrl(p.coverImage),
    stock: p.stock,
    isFree: p.isFree,
    isBestseller: p.isBestseller,
    isFeatured: p.isFeatured,
    durationSeconds: p.durationSeconds,
    avgRating: avg,
    reviewCount: p._count?.reviews ?? ratings.length,
  };
}

// Сортирането живее в отделен, клиентски-безопасен модул (виж catalog.ts),
// защото контролите за филтриране са клиентски компонент.
export { orderByFor, SORT_LABELS, type SortOption } from "./catalog";

export async function getProducts(opts: {
  type: ProductType;
  categorySlug?: string;
  sort?: SortOption;
  page?: number;
  perPage?: number;
}): Promise<{ items: ProductCardData[]; total: number; pages: number }> {
  const perPage = opts.perPage ?? 12;
  const page = Math.max(1, opts.page ?? 1);

  const where: Prisma.ProductWhereInput = {
    type: opts.type,
    isPublished: true,
    ...(opts.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
  };

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where,
      select: {
        ...CARD_SELECT,
        reviews: { where: { isApproved: true }, select: { rating: true } },
      },
      orderBy: orderByFor(opts.sort ?? "newest"),
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.product.count({ where }),
  ]);

  return {
    items: rows.map(toCardData),
    total,
    pages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getBestsellers(limit = 4): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: { type: "PHYSICAL", isPublished: true, isBestseller: true },
    select: {
      ...CARD_SELECT,
      reviews: { where: { isApproved: true }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // Ако собственикът още не е маркирал "най-продавани", показваме най-новите,
  // за да не остане секцията празна.
  if (rows.length === 0) {
    const fallback = await db.product.findMany({
      where: { type: "PHYSICAL", isPublished: true },
      select: {
        ...CARD_SELECT,
        reviews: { where: { isApproved: true }, select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return fallback.map(toCardData);
  }

  return rows.map(toCardData);
}

export async function getLatestByType(
  type: ProductType,
  limit = 4,
): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: { type, isPublished: true },
    select: {
      ...CARD_SELECT,
      reviews: { where: { isApproved: true }, select: { rating: true } },
    },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toCardData);
}

/**
 * Свързани книги ("Може да ви хареса").
 * Първо ръчно зададените от админа; ако не стигат — от същата категория.
 */
export async function getRelatedProducts(
  productId: string,
  categoryId: string | null,
  type: ProductType,
  limit = 4,
): Promise<ProductCardData[]> {
  const manual = await db.productRelation.findMany({
    where: { sourceId: productId, target: { isPublished: true } },
    select: {
      target: {
        select: {
          ...CARD_SELECT,
          reviews: { where: { isApproved: true }, select: { rating: true } },
        },
      },
    },
    take: limit,
  });

  const items = manual.map((m) => toCardData(m.target));
  if (items.length >= limit) return items;

  const excludeIds = [productId, ...items.map((i) => i.id)];
  const filler = await db.product.findMany({
    where: {
      isPublished: true,
      id: { notIn: excludeIds },
      ...(categoryId ? { categoryId } : { type }),
    },
    select: {
      ...CARD_SELECT,
      reviews: { where: { isApproved: true }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit - items.length,
  });

  return [...items, ...filler.map(toCardData)];
}

export async function getCategories() {
  return db.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: { where: { isPublished: true } } } },
    },
  });
}

export async function getLatestPosts(limit = 3) {
  const posts = await db.post.findMany({
    where: { isPublished: true, publishedAt: { lte: new Date() } },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      coverImage: true,
      publishedAt: true,
    },
  });
  return posts.map((p) => ({ ...p, coverImage: publicUrl(p.coverImage) }));
}

/** Средна оценка и брой ревюта за един продукт. */
export async function getRatingSummary(productId: string) {
  const result = await db.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return {
    average: result._avg.rating ?? 0,
    count: result._count.rating,
  };
}
