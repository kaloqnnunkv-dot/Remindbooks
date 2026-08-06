import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { publicUrl } from "@/lib/storage";
import { formatPrice, discountPercent, truncate, stripHtml } from "@/lib/format";
import { getRelatedProducts, getRatingSummary } from "@/lib/queries";
import { getFavoriteIds } from "@/app/actions/favorites";

import { Badge, Breadcrumbs, SectionHeading } from "@/components/ui";
import { ProductGallery } from "@/components/product-gallery";
import { ProductCard } from "@/components/product-card";
import { BuyBox } from "@/components/add-to-cart";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButtons } from "@/components/share-buttons";
import { ReviewSection } from "@/components/reviews";
import { CheckIcon, PackageIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function getBook(slug: string) {
  return db.product.findFirst({
    where: { slug, type: "PHYSICAL", isPublished: true },
    include: {
      category: { select: { name: true, slug: true } },
      images: { orderBy: { order: "asc" } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) return { title: "Книгата не е намерена" };

  const description =
    book.metaDescription ?? truncate(stripHtml(book.shortDesc ?? book.description), 155);
  const cover = publicUrl(book.coverImage);

  return {
    title: book.metaTitle ?? book.title,
    description,
    alternates: { canonical: `/knigi/${book.slug}` },
    openGraph: {
      type: "article",
      title: book.metaTitle ?? book.title,
      description,
      url: `${env.appUrl}/knigi/${book.slug}`,
      images: cover ? [{ url: cover, alt: book.title }] : undefined,
    },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const [related, rating, reviews, favoriteIds, ownReview] = await Promise.all([
    getRelatedProducts(book.id, book.categoryId, "PHYSICAL", 4),
    getRatingSummary(book.id),
    db.review.findMany({
      where: { productId: book.id, isApproved: true },
      orderBy: [{ verifiedPurchase: "desc" }, { createdAt: "desc" }],
      take: 20,
      select: {
        id: true, rating: true, title: true, body: true,
        verifiedPurchase: true, createdAt: true,
        user: { select: { name: true } },
      },
    }),
    getFavoriteIds(),
    userId
      ? db.review.findFirst({
          where: { productId: book.id, userId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const cover = publicUrl(book.coverImage);
  const galleryImages = [
    ...(cover ? [{ url: cover, alt: book.title }] : []),
    ...book.images
      .map((i) => ({ url: publicUrl(i.url), alt: i.alt }))
      .filter((i): i is { url: string; alt: string | null } => Boolean(i.url)),
  ];

  const discount = discountPercent(book.priceCents, book.compareAtCents);
  const outOfStock = book.stock <= 0;
  const lowStock = book.stock > 0 && book.stock <= book.lowStockAlert;

  // Структурирани данни за Google (rich results с цена, наличност и оценка).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: book.author ? { "@type": "Person", name: book.author } : undefined,
    description: truncate(stripHtml(book.description), 300),
    image: cover ?? undefined,
    offers: {
      "@type": "Offer",
      price: (book.priceCents / 100).toFixed(2),
      priceCurrency: "BGN",
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
      url: `${env.appUrl}/knigi/${book.slug}`,
    },
    aggregateRating:
      rating.count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            reviewCount: rating.count,
          }
        : undefined,
  };

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumbs
        items={[
          { label: "Начало", href: "/" },
          { label: "Книги", href: "/knigi" },
          ...(book.category
            ? [{ label: book.category.name, href: `/knigi?kategoria=${book.category.slug}` }]
            : []),
          { label: book.title },
        ]}
      />

      <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">
        {/* Галерия */}
        <div className="lg:col-span-2">
          <ProductGallery images={galleryImages} title={book.title} />
        </div>

        {/* Информация и покупка */}
        <div className="lg:col-span-3">
          <div className="flex flex-wrap gap-2 mb-3">
            {book.isBestseller && <Badge tone="primary">Най-продавана</Badge>}
            {book.isFeatured && <Badge tone="outline">Препоръчана</Badge>}
            {discount && <Badge tone="destructive">−{discount}%</Badge>}
          </div>

          <h1 className="text-3xl sm:text-4xl leading-tight">{book.title}</h1>

          {book.author && (
            <p className="mt-2 text-lg text-muted-foreground">{book.author}</p>
          )}

          {rating.count > 0 && (
            <a
              href="#reviews"
              className="mt-3 inline-flex items-center gap-2 text-sm hover:text-primary transition-colors"
            >
              <span className="font-sans font-bold tabular-nums">
                {rating.average.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                ({rating.count} {rating.count === 1 ? "ревю" : "ревюта"})
              </span>
            </a>
          )}

          {/* Цена */}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-sans text-3xl font-bold">
              {formatPrice(book.priceCents)}
            </span>
            {book.compareAtCents && book.compareAtCents > book.priceCents && (
              <span className="text-lg text-muted-foreground line-through">
                {formatPrice(book.compareAtCents)}
              </span>
            )}
          </div>

          {/* Наличност */}
          <div className="mt-4">
            {outOfStock ? (
              <p className="inline-flex items-center gap-2 text-sm text-destructive font-sans font-bold">
                Изчерпана наличност
              </p>
            ) : lowStock ? (
              <p className="inline-flex items-center gap-2 text-sm text-warning font-sans font-bold">
                <PackageIcon size={16} />
                Остават само {book.stock} бр.
              </p>
            ) : (
              <p className="inline-flex items-center gap-2 text-sm text-success font-sans font-bold">
                <CheckIcon size={16} />В наличност
              </p>
            )}
          </div>

          {/* Покупка */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <BuyBox
              productId={book.id}
              type="PHYSICAL"
              slug={book.slug}
              stock={book.stock}
              disabled={outOfStock}
            />
            <FavoriteButton
              productId={book.id}
              initial={favoriteIds.has(book.id)}
            />
          </div>

          {/* Информация за доставка */}
          <div className="mt-6 p-4 bg-muted rounded-md text-sm space-y-1.5">
            <p className="flex items-center gap-2">
              <PackageIcon size={16} className="text-primary shrink-0" />
              Доставка до адрес или офис на куриер в цялата страна.
            </p>
            {env.shop.freeShippingOverCents > 0 && (
              <p className="text-muted-foreground pl-6">
                Безплатна доставка при поръчка над{" "}
                {formatPrice(env.shop.freeShippingOverCents)}.
              </p>
            )}
            {env.features.cod && (
              <p className="text-muted-foreground pl-6">
                Възможен наложен платеж при получаване.
              </p>
            )}
          </div>

          {/* Описание */}
          <div className="mt-8">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Описание
            </h2>
            <div
              className="prose-rmb text-[15px]"
              dangerouslySetInnerHTML={{ __html: book.description }}
            />
          </div>

          <ShareButtons
            path={`/knigi/${book.slug}`}
            title={book.title}
            className="mt-8 pt-6 border-t border-border"
          />
        </div>
      </div>

      <ReviewSection
        productId={book.id}
        reviews={reviews}
        average={rating.average}
        count={rating.count}
        canReview={Boolean(userId)}
        hasReviewed={Boolean(ownReview)}
        isLoggedIn={Boolean(userId)}
      />

      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-border">
          <SectionHeading title="Може да ви хареса" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-9">
            {related.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isFavorite={favoriteIds.has(p.id)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
