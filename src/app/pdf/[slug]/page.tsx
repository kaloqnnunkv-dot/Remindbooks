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

import { Badge, Breadcrumbs, SectionHeading, ButtonLink, Alert } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { ProductTypeBadge } from "@/components/product-type-badge";
import { BuyBox } from "@/components/add-to-cart";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButtons } from "@/components/share-buttons";
import { ReviewSection } from "@/components/reviews";
import { PdfFlipbook } from "@/components/pdf-flipbook";
import { Book3D } from "@/components/book-3d";
import { CheckIcon, DownloadIcon} from "@/components/icons";

export const dynamic = "force-dynamic";

async function getBook(slug: string) {
  return db.product.findFirst({
    where: { slug, type: "PDF", isPublished: true },
    include: { category: { select: { name: true, slug: true } } },
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
    alternates: { canonical: `/pdf/${book.slug}` },
    openGraph: {
      type: "article",
      title: book.metaTitle ?? book.title,
      description,
      url: `${env.appUrl}/pdf/${book.slug}`,
      images: cover ? [{ url: cover, alt: book.title }] : undefined,
    },
  };
}

export default async function PdfBookPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const [related, rating, reviews, favoriteIds, ownReview, entitlement] =
    await Promise.all([
      getRelatedProducts(book.id, book.categoryId, "PDF", 4),
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
        ? db.review.findFirst({ where: { productId: book.id, userId }, select: { id: true } })
        : Promise.resolve(null),
      // Дали потребителят вече притежава книгата
      userId
        ? db.entitlement.findUnique({
            where: { userId_productId: { userId, productId: book.id } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

  const cover = publicUrl(book.coverImage);
  const discount = discountPercent(book.priceCents, book.compareAtCents);
  const owned = Boolean(entitlement);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    bookFormat: "https://schema.org/EBook",
    name: book.title,
    author: book.author ? { "@type": "Person", name: book.author } : undefined,
    description: truncate(stripHtml(book.description), 300),
    image: cover ?? undefined,
    offers: {
      "@type": "Offer",
      price: (book.priceCents / 100).toFixed(2),
      priceCurrency: "BGN",
      availability: "https://schema.org/InStock",
      url: `${env.appUrl}/pdf/${book.slug}`,
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
          { label: "PDF книги", href: "/pdf" },
          { label: book.title },
        ]}
      />

      <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">
        <div className="lg:col-span-2">
          <div className="relative">
            <Book3D cover={cover} title={book.title} />
            <span className="absolute left-3 top-3 z-10">
              <ProductTypeBadge type="PDF" />
            </span>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <ProductTypeBadge type="PDF" variant="inline" />
            {book.isBestseller && <Badge tone="primary">Най-продавана</Badge>}
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

          {owned ? (
            <div className="mt-6">
              <Alert tone="success">Вече притежавате тази книга.</Alert>
              <ButtonLink href="/profil/moite-knigi" size="lg" className="mt-4">
                <DownloadIcon size={18} />
                Отвори в моите книги
              </ButtonLink>
            </div>
          ) : (
            <>
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

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <BuyBox
                  productId={book.id}
                  type="PDF"
                  slug={book.slug}
                  stock={999}
                />
                <FavoriteButton
                  productId={book.id}
                  initial={favoriteIds.has(book.id)}
                />
              </div>
            </>
          )}

          {/* Какво получавате */}
          <ul className="mt-6 p-4 bg-muted rounded-md text-sm space-y-2">
            <Perk>Мигновен достъп веднага след плащането</Perk>
            <Perk>Линк за сваляне на вашия имейл</Perk>
            <Perk>Достъп завинаги от профила ви</Perk>
            <Perk>Без адрес за доставка и без задължителна регистрация</Perk>
          </ul>

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
            path={`/pdf/${book.slug}`}
            title={book.title}
            className="mt-8 pt-6 border-t border-border"
          />
        </div>
      </div>

      {/* Preview на първите страници */}
      {book.previewKey && (
        <section className="mt-14">
          <SectionHeading title="Прелистете преди да купите" />
          <PdfFlipbook
            cover={cover}
            title={book.title}
            previewUrl={`/api/preview/${book.id}`}
            pageCount={book.previewPages || 5}
          />
        </section>
      )}

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
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-5">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} isFavorite={favoriteIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Perk({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckIcon size={16} className="text-success shrink-0 mt-0.5" />
      <span>{children}</span>
    </li>
  );
}
