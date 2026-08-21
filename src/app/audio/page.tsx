import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { publicUrl } from "@/lib/storage";
import { formatPrice, formatDuration, truncate, stripHtml } from "@/lib/format";
import { getCategories, orderByFor, type SortOption } from "@/lib/queries";
import { getFavoriteIds } from "@/app/actions/favorites";
import { getSiteImages } from "@/lib/images";

import { PageBanner, EmptyState, Badge, ButtonLink } from "@/components/ui";
import { CatalogControls } from "@/components/catalog-controls";
import { Pagination } from "@/components/pagination";
import { AudioPlayer } from "@/components/audio-player";
import { ProductTypeBadge } from "@/components/product-type-badge";
import { AddToCartButton } from "@/components/add-to-cart";
import { FavoriteButton } from "@/components/favorite-button";
import { HeadphonesIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Аудио съдържание",
  description:
    "Медитации, четения и аудио програми от Remind Books. Слушайте безплатни материали или отключете пълните записи.",
  alternates: { canonical: "/audio" },
};

const PER_PAGE = 10;

export default async function AudioPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; sort?: string; stranica?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.stranica) || 1);
  const sort = (params.sort ?? "newest") as SortOption;

  const session = await auth();
  const userId = session?.user?.id;

  const where = {
    type: "AUDIO" as const,
    isPublished: true,
    ...(params.kategoria ? { category: { slug: params.kategoria } } : {}),
  };

  const [items, total, categories, favoriteIds, entitlements, images] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: orderByFor(sort),
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, slug: true, title: true, author: true, shortDesc: true,
        description: true, priceCents: true, compareAtCents: true,
        coverImage: true, durationSeconds: true, isFree: true,
        previewKey: true, fileKey: true,
      },
    }),
    db.product.count({ where }),
    getCategories(),
    getFavoriteIds(),
    userId
      ? db.entitlement.findMany({
          where: { userId },
          select: { productId: true },
        })
      : Promise.resolve([]),
    getSiteImages(),
  ]);

  const ownedIds = new Set(entitlements.map((e) => e.productId));
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="container-page py-12">
      <PageBanner
        image={images.audio}
        title="Аудио съдържание"
        description="Медитации, водени практики и авторски четения. Част от материалите са напълно безплатни — натиснете play и слушайте."
      />

      <CatalogControls categories={categories} total={total} />

      {items.length === 0 ? (
        <EmptyState
          icon={<HeadphonesIcon size={40} />}
          title="Няма намерено аудио съдържание"
          description="Скоро тук ще има какво да чуете."
        />
      ) : (
        <>
          <div className="space-y-6">
            {items.map((item) => {
              const cover = publicUrl(item.coverImage);
              const owned = ownedIds.has(item.id);
              // Безплатното и притежаваното се пускат цели; иначе — само откъс.
              const playableSrc = item.isFree || owned
                ? `/api/audio/${item.id}`
                : item.previewKey
                  ? `/api/preview/${item.id}`
                  : null;

              return (
                <article
                  key={item.id}
                  className="flex flex-col sm:flex-row gap-5 p-5 bg-card border border-border rounded-md"
                >
                  <Link
                    href={`/audio/${item.slug}`}
                    className="relative w-28 sm:w-36 aspect-[2/3] shrink-0 bg-card rounded-md overflow-hidden border border-border"
                  >
                    {cover ? (
                      <Image
                        src={cover}
                        alt={item.title}
                        fill
                        sizes="144px"
                        className="object-contain"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <HeadphonesIcon size={30} />
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          <ProductTypeBadge type="AUDIO" variant="inline" short />
                          {item.isFree && <Badge tone="success">Безплатно</Badge>}
                          {owned && !item.isFree && <Badge tone="primary">Ваше</Badge>}
                          {item.durationSeconds ? (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(item.durationSeconds)}
                            </span>
                          ) : null}
                        </div>

                        <h2 className="text-lg leading-snug">
                          <Link
                            href={`/audio/${item.slug}`}
                            className="hover:text-primary transition-colors"
                          >
                            {item.title}
                          </Link>
                        </h2>

                        {item.author && (
                          <p className="text-sm text-muted-foreground">{item.author}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <FavoriteButton
                          productId={item.id}
                          initial={favoriteIds.has(item.id)}
                          compact
                        />
                        {!item.isFree && !owned && (
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold">
                              {formatPrice(item.priceCents)}
                            </span>
                            <AddToCartButton
                              productId={item.id}
                              type="AUDIO"
                              slug={item.slug}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {item.shortDesc ?? truncate(stripHtml(item.description), 180)}
                    </p>

                    {playableSrc && (
                      <AudioPlayer
                        src={playableSrc}
                        isPreview={!item.isFree && !owned}
                        className="mt-4"
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <Pagination page={page} pages={pages} basePath="/audio" searchParams={params} />
        </>
      )}
    </div>
  );
}
