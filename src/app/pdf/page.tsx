import type { Metadata } from "next";
import { PageHeader, EmptyState, Card } from "@/components/ui";
import { ProductCard, ProductGrid } from "@/components/product-card";
import { CatalogControls } from "@/components/catalog-controls";
import { Pagination } from "@/components/pagination";
import { FileTextIcon, DownloadIcon, CheckIcon } from "@/components/icons";
import { getProducts, getCategories, type SortOption } from "@/lib/queries";
import { getFavoriteIds } from "@/app/actions/favorites";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PDF книги",
  description:
    "Дигитални книги от ReMindBooks — плащате с карта и четете веднага. Без доставка и без чакане.",
  alternates: { canonical: "/pdf" },
};

const PER_PAGE = 12;

export default async function PdfPage({
  searchParams,
}: {
  searchParams: Promise<{ kategoria?: string; sort?: string; stranica?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.stranica) || 1);
  const sort = (params.sort ?? "newest") as SortOption;

  const [{ items, total, pages }, categories, favoriteIds] = await Promise.all([
    getProducts({
      type: "PDF",
      categorySlug: params.kategoria,
      sort,
      page,
      perPage: PER_PAGE,
    }),
    getCategories(),
    getFavoriteIds(),
  ]);

  return (
    <div className="container-page py-12">
      <PageHeader
        title="PDF книги"
        description="Плащате с карта и книгата се отключва веднага в профила ви. Без адрес за доставка, без излишни данни."
      />

      {/* Как работи — трите стъпки на опростения флоу */}
      <Card className="mb-10 p-6 bg-muted border-0">
        <ol className="grid gap-5 sm:grid-cols-3">
          <Step
            n={1}
            icon={<FileTextIcon size={18} />}
            title="Изберете книга"
            text="Прелистете безплатния откъс преди да решите."
          />
          <Step
            n={2}
            icon={<CheckIcon size={18} />}
            title="Платете с карта"
            text="Нужни са само имейл и карта. Без регистрация."
          />
          <Step
            n={3}
            icon={<DownloadIcon size={18} />}
            title="Четете веднага"
            text="Линк за сваляне на имейла и достъп в профила."
          />
        </ol>
      </Card>

      <CatalogControls categories={categories} total={total} />

      {items.length === 0 ? (
        <EmptyState
          icon={<FileTextIcon size={40} />}
          title="Няма намерени PDF книги"
          description="Скоро тук ще има дигитални заглавия."
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

          <Pagination page={page} pages={pages} basePath="/pdf" searchParams={params} />
        </>
      )}
    </div>
  );
}

function Step({
  n,
  icon,
  title,
  text,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="shrink-0 h-9 w-9 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground">
        {icon}
      </span>
      <div>
        <p className="font-sans text-sm font-bold">
          <span className="text-primary mr-1">{n}.</span>
          {title}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">{text}</p>
      </div>
    </li>
  );
}
