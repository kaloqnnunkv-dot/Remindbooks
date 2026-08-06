import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { formatDate, truncate, stripHtml } from "@/lib/format";
import { toCardData } from "@/lib/queries";
import { getFavoriteIds } from "@/app/actions/favorites";

import { PageHeader, EmptyState, ButtonLink, SectionHeading } from "@/components/ui";
import { ProductCard, ProductGrid } from "@/components/product-card";
import { SearchIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Търсене",
  description: "Търсене в каталога и блога на Remind Books.",
  // Страниците с резултати не носят стойност в индекса на Google.
  robots: { index: false, follow: true },
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().slice(0, 100);

  if (query.length < 2) {
    return (
      <div className="container-page py-12">
        <PageHeader title="Търсене" />
        <EmptyState
          icon={<SearchIcon size={40} />}
          title="Въведете какво търсите"
          description="Използвайте търсачката в горната лента или въведете поне 2 символа."
          action={<ButtonLink href="/knigi">Разгледай каталога</ButtonLink>}
        />
      </div>
    );
  }

  const [products, posts, favoriteIds] = await Promise.all([
    db.product.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { author: { contains: query, mode: "insensitive" } },
          { shortDesc: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true, slug: true, title: true, author: true, type: true,
        priceCents: true, compareAtCents: true, coverImage: true,
        stock: true, isFree: true, isBestseller: true, isFeatured: true,
        durationSeconds: true,
        reviews: { where: { isApproved: true }, select: { rating: true } },
      },
      orderBy: [{ isBestseller: "desc" }, { createdAt: "desc" }],
      take: 24,
    }),
    db.post.findMany({
      where: {
        isPublished: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { excerpt: { contains: query, mode: "insensitive" } },
          { body: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true, slug: true, title: true, excerpt: true,
        coverImage: true, publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 8,
    }),
    getFavoriteIds(),
  ]);

  const cards = products.map(toCardData);
  const totalResults = cards.length + posts.length;

  return (
    <div className="container-page py-12">
      <PageHeader
        title={`Резултати за „${query}“`}
        description={
          totalResults === 0
            ? undefined
            : `Намерени ${totalResults} ${totalResults === 1 ? "резултат" : "резултата"}.`
        }
      />

      {totalResults === 0 ? (
        <EmptyState
          icon={<SearchIcon size={40} />}
          title="Няма намерени резултати"
          description="Опитайте с друга дума или разгледайте целия каталог."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <ButtonLink href="/knigi">Физически книги</ButtonLink>
              <ButtonLink href="/pdf" variant="outline">
                PDF книги
              </ButtonLink>
              <ButtonLink href="/audio" variant="outline">
                Аудио
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <div className="space-y-16">
          {cards.length > 0 && (
            <section>
              <SectionHeading title="Книги и аудио" />
              <ProductGrid>
                {cards.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    isFavorite={favoriteIds.has(p.id)}
                  />
                ))}
              </ProductGrid>
            </section>
          )}

          {posts.length > 0 && (
            <section>
              <SectionHeading title="Публикации от блога" />
              <div className="space-y-4">
                {posts.map((post) => {
                  const cover = publicUrl(post.coverImage);
                  return (
                    <article
                      key={post.id}
                      className="flex gap-4 p-4 bg-card border border-border rounded-md"
                    >
                      <Link
                        href={`/blog/${post.slug}`}
                        className="relative w-24 h-20 shrink-0 bg-muted rounded-sm overflow-hidden"
                      >
                        {cover && (
                          <Image
                            src={cover}
                            alt=""
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        )}
                      </Link>
                      <div className="min-w-0">
                        <h3 className="font-sans font-bold leading-snug">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="hover:text-primary transition-colors"
                          >
                            {post.title}
                          </Link>
                        </h3>
                        {post.publishedAt && (
                          <time
                            dateTime={post.publishedAt.toISOString()}
                            className="text-xs text-muted-foreground"
                          >
                            {formatDate(post.publishedAt)}
                          </time>
                        )}
                        {post.excerpt && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {truncate(stripHtml(post.excerpt), 160)}
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
