import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { truncate, stripHtml, BG_PRODUCT_TYPE } from "@/lib/format";
import { productHref } from "@/components/product-card";

export const dynamic = "force-dynamic";

/**
 * Търсене на живо за падащото меню в навигацията.
 *
 * Обхваща физически книги, PDF книги, аудио и блог публикации — както изисква
 * спецификацията. Търси се в заглавие, автор и описание (case-insensitive).
 */
export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  // Ограничаваме дължината, за да не се правят скъпи заявки с огромен низ.
  const q = query.slice(0, 100);

  const [products, posts] = await Promise.all([
    db.product.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { author: { contains: q, mode: "insensitive" } },
          { shortDesc: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true, slug: true, title: true, author: true, type: true,
        priceCents: true, coverImage: true, isFree: true,
      },
      orderBy: [{ isBestseller: "desc" }, { createdAt: "desc" }],
      take: 6,
    }),
    db.post.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { excerpt: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, slug: true, title: true, excerpt: true, coverImage: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  const results = [
    ...products.map((p) => ({
      id: p.id,
      kind: "product" as const,
      title: p.title,
      subtitle: p.author,
      href: productHref(p),
      image: publicUrl(p.coverImage),
      priceCents: p.isFree ? 0 : p.priceCents,
      typeLabel: BG_PRODUCT_TYPE[p.type] ?? "",
    })),
    ...posts.map((p) => ({
      id: p.id,
      kind: "post" as const,
      title: p.title,
      subtitle: p.excerpt ? truncate(stripHtml(p.excerpt), 70) : null,
      href: `/blog/${p.slug}`,
      image: publicUrl(p.coverImage),
      priceCents: null,
      typeLabel: "Блог",
    })),
  ];

  return NextResponse.json(
    { results },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
