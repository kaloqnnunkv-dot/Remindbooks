import type { Metadata } from "next";
import { PageHeader, EmptyState, ButtonLink } from "@/components/ui";
import { ProductCard, ProductGrid } from "@/components/product-card";
import { CatalogControls } from "@/components/catalog-controls";
import { Pagination } from "@/components/pagination";
import { BookIcon } from "@/components/icons";
import { getProducts, getCategories, type SortOption } from "@/lib/queries";
import { getFavoriteIds } from "@/app/actions/favorites";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { formatPrice } from "@/lib/format";
import { AddBundleButton } from "@/components/add-to-cart";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Физически книги",
  description:
    "Хартиени издания на Remind Books с доставка до адрес или офис на куриер. Разгледайте пълния каталог.",
  alternates: { canonical: "/knigi" },
};

const PER_PAGE = 12;

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; sort?: string; stranica?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.stranica) || 1);
  const sort = (params.sort ?? "newest") as SortOption;

  const [{ items, total, pages }, categories, favoriteIds, bundles] =
    await Promise.all([
      getProducts({
        type: "PHYSICAL",
        categorySlug: params.kategoria,
        sort,
        page,
        perPage: PER_PAGE,
      }),
      getCategories(),
      getFavoriteIds(),
      db.bundle.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          slug: true,
          title: true,
          description: true,
          priceCents: true,
          coverImage: true,
          items: {
            select: { product: { select: { title: true, priceCents: true } } },
          },
        },
        take: 3,
      }),
    ]);

  return (
    <div className="container-page py-12">
      <PageHeader
        title="Физически книги"
        description="Хартиени издания с доставка до адрес или офис на куриер в цялата страна."
      />

      <CatalogControls categories={categories} total={total} />

      {items.length === 0 ? (
        <EmptyState
          icon={<BookIcon size={40} />}
          title="Няма намерени книги"
          description={
            params.kategoria
              ? "Опитайте с друга категория или разгледайте целия каталог."
              : "Скоро тук ще има какво да разгледате."
          }
          action={
            params.kategoria ? (
              <ButtonLink href="/knigi" variant="outline">
                Виж всички книги
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <ProductGrid>
            {items.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                isFavorite={favoriteIds.has(p.id)}
                priority={i < 4}
              />
            ))}
          </ProductGrid>

          <Pagination
            page={page}
            pages={pages}
            basePath="/knigi"
            searchParams={params}
          />
        </>
      )}

      {/* Комплекти книги на намалена цена */}
      {bundles.length > 0 && page === 1 && (
        <section className="mt-20" aria-labelledby="bundles">
          <h2 id="bundles" className="text-2xl sm:text-3xl rule mb-8">
            Комплекти на промоционална цена
          </h2>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bundles.map((bundle) => {
              const fullPrice = bundle.items.reduce(
                (sum, i) => sum + i.product.priceCents,
                0,
              );
              const savings = fullPrice - bundle.priceCents;
              const cover = publicUrl(bundle.coverImage);

              return (
                <div
                  key={bundle.id}
                  className="flex flex-col bg-card border border-border rounded-md overflow-hidden"
                >
                  <div className="relative aspect-[3/2] bg-card">
                    {cover && (
                      <Image
                        src={cover}
                        alt={bundle.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-contain"
                      />
                    )}
                    {savings > 0 && (
                      <span className="absolute top-3 left-3 bg-destructive text-destructive-foreground px-2 py-1 rounded-sm font-sans text-xs font-bold">
                        Спестявате {formatPrice(savings)}
                      </span>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-sans font-bold">{bundle.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {bundle.description}
                    </p>

                    <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                      {bundle.items.slice(0, 4).map((i, idx) => (
                        <li key={idx}>• {i.product.title}</li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-4 flex items-center justify-between gap-3">
                      <div>
                        {savings > 0 && (
                          <div className="text-xs text-muted-foreground line-through">
                            {formatPrice(fullPrice)}
                          </div>
                        )}
                        <div className="font-sans font-bold text-lg">
                          {formatPrice(bundle.priceCents)}
                        </div>
                      </div>
                      <AddBundleButton bundleId={bundle.id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
