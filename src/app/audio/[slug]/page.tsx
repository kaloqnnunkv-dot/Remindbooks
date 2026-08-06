import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { publicUrl } from "@/lib/storage";
import { formatPrice, formatDuration, truncate, stripHtml, discountPercent } from "@/lib/format";
import { getRelatedProducts, getRatingSummary } from "@/lib/queries";
import { getFavoriteIds } from "@/app/actions/favorites";

import { Badge, Breadcrumbs, SectionHeading, Alert } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { ProductTypeBadge } from "@/components/product-type-badge";
import { BuyBox } from "@/components/add-to-cart";
import { FavoriteButton } from "@/components/favorite-button";
import { ShareButtons } from "@/components/share-buttons";
import { ReviewSection } from "@/components/reviews";
import { AudioPlayer } from "@/components/audio-player";
import { HeadphonesIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function getAudio(slug: string) {
  return db.product.findFirst({
    where: { slug, type: "AUDIO", isPublished: true },
    include: { category: { select: { name: true, slug: true } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const item = await getAudio(slug);
  if (!item) return { title: "Съдържанието не е намерено" };

  const description =
    item.metaDescription ?? truncate(stripHtml(item.shortDesc ?? item.description), 155);
  const cover = publicUrl(item.coverImage);

  return {
    title: item.metaTitle ?? item.title,
    description,
    alternates: { canonical: `/audio/${item.slug}` },
    openGraph: {
      type: "music.song",
      title: item.metaTitle ?? item.title,
      description,
      url: `${env.appUrl}/audio/${item.slug}`,
      images: cover ? [{ url: cover, alt: item.title }] : undefined,
    },
  };
}

export default async function AudioDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getAudio(slug);
  if (!item) notFound();

  const session = await auth();
  const userId = session?.user?.id;

  const [related, rating, reviews, favoriteIds, ownReview, entitlement] =
    await Promise.all([
      getRelatedProducts(item.id, item.categoryId, "AUDIO", 4),
      getRatingSummary(item.id),
      db.review.findMany({
        where: { productId: item.id, isApproved: true },
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
        ? db.review.findFirst({ where: { productId: item.id, userId }, select: { id: true } })
        : Promise.resolve(null),
      userId
        ? db.entitlement.findUnique({
            where: { userId_productId: { userId, productId: item.id } },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

  const cover = publicUrl(item.coverImage);
  const owned = Boolean(entitlement) || item.isFree;
  const discount = discountPercent(item.priceCents, item.compareAtCents);

  // Пълният запис само за притежатели; иначе откъс, ако има качен.
  const playableSrc = owned
    ? `/api/audio/${item.id}`
    : item.previewKey
      ? `/api/preview/${item.id}`
      : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AudioObject",
    name: item.title,
    description: truncate(stripHtml(item.description), 300),
    image: cover ?? undefined,
    duration: item.durationSeconds ? `PT${item.durationSeconds}S` : undefined,
    ...(item.isFree
      ? {}
      : {
          offers: {
            "@type": "Offer",
            price: (item.priceCents / 100).toFixed(2),
            priceCurrency: "BGN",
            url: `${env.appUrl}/audio/${item.slug}`,
          },
        }),
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
          { label: "Аудио", href: "/audio" },
          { label: item.title },
        ]}
      />

      <div className="grid lg:grid-cols-5 gap-10 lg:gap-14">
        <div className="lg:col-span-2">
          <div className="relative aspect-square bg-muted border border-border rounded-md overflow-hidden">
            {cover ? (
              <Image
                src={cover}
                alt={item.title}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                priority
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <HeadphonesIcon size={48} />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <ProductTypeBadge type="AUDIO" variant="inline" />
            {item.isFree && <Badge tone="success">Безплатно</Badge>}
            {!item.isFree && owned && <Badge tone="primary">Ваше</Badge>}
            {discount && <Badge tone="destructive">−{discount}%</Badge>}
            {item.durationSeconds ? (
              <Badge tone="outline">{formatDuration(item.durationSeconds)}</Badge>
            ) : null}
          </div>

          <h1 className="text-3xl sm:text-4xl leading-tight">{item.title}</h1>

          {item.author && (
            <p className="mt-2 text-lg text-muted-foreground">{item.author}</p>
          )}

          {/* Плейър */}
          {playableSrc ? (
            <AudioPlayer
              src={playableSrc}
              isPreview={!owned}
              className="mt-6"
              title={owned ? undefined : "Чуйте откъс"}
            />
          ) : (
            !owned && (
              <Alert className="mt-6">
                Купете, за да получите достъп до пълния запис.
              </Alert>
            )
          )}

          {/* Покупка */}
          {!owned && (
            <>
              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-sans text-3xl font-bold">
                  {formatPrice(item.priceCents)}
                </span>
                {item.compareAtCents && item.compareAtCents > item.priceCents && (
                  <span className="text-lg text-muted-foreground line-through">
                    {formatPrice(item.compareAtCents)}
                  </span>
                )}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <BuyBox productId={item.id} type="AUDIO" slug={item.slug} stock={999} />
                <FavoriteButton
                  productId={item.id}
                  initial={favoriteIds.has(item.id)}
                />
              </div>
            </>
          )}

          {owned && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <FavoriteButton
                productId={item.id}
                initial={favoriteIds.has(item.id)}
              />
            </div>
          )}

          <div className="mt-8">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Описание
            </h2>
            <div
              className="prose-rmb text-[15px]"
              dangerouslySetInnerHTML={{ __html: item.description }}
            />
          </div>

          <ShareButtons
            path={`/audio/${item.slug}`}
            title={item.title}
            className="mt-8 pt-6 border-t border-border"
          />
        </div>
      </div>

      <ReviewSection
        productId={item.id}
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
              <ProductCard key={p.id} product={p} isFavorite={favoriteIds.has(p.id)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
