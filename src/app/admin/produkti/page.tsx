import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import type { Prisma, ProductType } from "@prisma/client";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { formatPrice, BG_PRODUCT_TYPE } from "@/lib/format";
import {
  AdminHeader,
  AdminTable,
  Th,
  Td,
  AdminEmpty,
  AdminTabs,
} from "@/components/admin/admin-ui";
import { ProductRowActions } from "@/components/admin/product-row-actions";
import { Badge, ButtonLink } from "@/components/ui";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Продукти",
  robots: { index: false, follow: false },
};

const PER_PAGE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; stranica?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.stranica) || 1);
  const filter = params.status ?? "all";
  const query = params.q?.trim() ?? "";

  // Типизира се явно, иначе TypeScript разширява `type` до `string`
  // и Prisma отхвърля филтъра.
  const isTypeFilter = ["PHYSICAL", "PDF", "AUDIO"].includes(filter);

  const where: Prisma.ProductWhereInput = {
    ...(isTypeFilter ? { type: filter as ProductType } : {}),
    ...(filter === "draft" ? { isPublished: false } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { author: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [products, total, counts] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, slug: true, title: true, author: true, type: true,
        priceCents: true, compareAtCents: true, stock: true, lowStockAlert: true,
        coverImage: true, isPublished: true, isFeatured: true, isBestseller: true,
        isFree: true,
        _count: { select: { orderItems: true } },
      },
    }),
    db.product.count({ where }),
    db.product.groupBy({ by: ["type"], _count: true }),
  ]);

  const countFor = (type: string) =>
    counts.find((c) => c.type === type)?._count ?? 0;

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <AdminHeader
        title="Продукти"
        description="Добавяне, редактиране и премахване на книги и аудио съдържание."
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/admin/produkti/kategorii" variant="outline">
              Категории
            </ButtonLink>
            <ButtonLink href="/admin/produkti/nov">Нов продукт</ButtonLink>
          </div>
        }
      />

      <AdminTabs
        basePath="/admin/produkti"
        current={filter}
        tabs={[
          { key: "all", label: "Всички" },
          { key: "PHYSICAL", label: "Физически", count: countFor("PHYSICAL") },
          { key: "PDF", label: "PDF", count: countFor("PDF") },
          { key: "AUDIO", label: "Аудио", count: countFor("AUDIO") },
          { key: "draft", label: "Чернови" },
        ]}
      />

      {/* Търсене */}
      <form className="mb-6 flex gap-2 max-w-md" action="/admin/produkti">
        {filter !== "all" && <input type="hidden" name="status" value={filter} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Търсене по заглавие или автор…"
          className="flex-1 h-10 rounded-md border border-input bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
        />
        <button
          type="submit"
          className="h-10 px-4 rounded-md bg-secondary text-secondary-foreground border border-border font-sans text-sm font-bold hover:bg-accent transition-colors"
        >
          Търси
        </button>
      </form>

      {products.length === 0 ? (
        <AdminEmpty
          title={query ? "Няма намерени продукти" : "Още няма продукти"}
          description={
            query
              ? "Опитайте с друга дума за търсене."
              : "Добавете първата книга, за да се появи в магазина."
          }
          action={<ButtonLink href="/admin/produkti/nov">Нов продукт</ButtonLink>}
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr>
                <Th className="w-14" />
                <Th>Заглавие</Th>
                <Th>Тип</Th>
                <Th className="text-right">Цена</Th>
                <Th className="text-center">Наличност</Th>
                <Th>Статус</Th>
                <Th className="text-right">Действия</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const cover = publicUrl(p.coverImage);
                const lowStock =
                  p.type === "PHYSICAL" && p.stock <= p.lowStockAlert;

                return (
                  <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                    <Td>
                      <div className="relative w-9 h-12 bg-muted rounded-sm overflow-hidden border border-border">
                        {cover && (
                          <Image
                            src={cover}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        )}
                      </div>
                    </Td>

                    <Td>
                      <Link
                        href={`/admin/produkti/${p.id}`}
                        className="font-sans font-bold hover:text-primary transition-colors line-clamp-1"
                      >
                        {p.title}
                      </Link>
                      {p.author && (
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {p.author}
                        </p>
                      )}
                    </Td>

                    <Td>
                      <Badge tone="outline">{BG_PRODUCT_TYPE[p.type]}</Badge>
                    </Td>

                    <Td className="text-right whitespace-nowrap">
                      {p.isFree ? (
                        <span className="text-success font-bold">Безплатно</span>
                      ) : (
                        <>
                          <span className="font-sans font-bold">
                            {formatPrice(p.priceCents)}
                          </span>
                          {p.compareAtCents && p.compareAtCents > p.priceCents && (
                            <span className="block text-xs text-muted-foreground line-through">
                              {formatPrice(p.compareAtCents)}
                            </span>
                          )}
                        </>
                      )}
                    </Td>

                    <Td className="text-center">
                      {p.type === "PHYSICAL" ? (
                        <span
                          className={
                            lowStock
                              ? "font-sans font-bold text-destructive tabular-nums"
                              : "tabular-nums"
                          }
                        >
                          {p.stock}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </Td>

                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {p.isPublished ? (
                          <Badge tone="success">Публикуван</Badge>
                        ) : (
                          <Badge tone="default">Чернова</Badge>
                        )}
                        {p.isBestseller && <Badge tone="primary">Най-продаван</Badge>}
                        {p.isFeatured && <Badge tone="outline">Препоръчан</Badge>}
                      </div>
                    </Td>

                    <Td className="text-right">
                      <ProductRowActions
                        productId={p.id}
                        slug={p.slug}
                        type={p.type}
                        isPublished={p.isPublished}
                        hasOrders={p._count.orderItems > 0}
                      />
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>

          <Pagination
            page={page}
            pages={pages}
            basePath="/admin/produkti"
            searchParams={params}
          />
        </>
      )}
    </div>
  );
}
