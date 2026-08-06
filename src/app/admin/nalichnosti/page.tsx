import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { formatPrice } from "@/lib/format";
import { AdminHeader, AdminTable, Th, Td, AdminEmpty, StatTile } from "@/components/admin/admin-ui";
import { StockEditor } from "@/components/admin/stock-editor";
import { Badge, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Наличности",
  robots: { index: false, follow: false },
};

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const onlyLow = params.filter === "low";

  const products = await db.product.findMany({
    where: { type: "PHYSICAL" },
    orderBy: [{ stock: "asc" }, { title: "asc" }],
    select: {
      id: true, slug: true, title: true, author: true, coverImage: true,
      stock: true, lowStockAlert: true, priceCents: true, isPublished: true,
    },
  });

  const lowStock = products.filter((p) => p.stock <= p.lowStockAlert);
  const outOfStock = products.filter((p) => p.stock === 0);
  const totalUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const stockValue = products.reduce((sum, p) => sum + p.stock * p.priceCents, 0);

  const visible = onlyLow ? lowStock : products;

  return (
    <div>
      <AdminHeader
        title="Наличности"
        description="Преглед и ръчна корекция на количествата за физическите книги."
        action={
          <ButtonLink
            href={onlyLow ? "/admin/nalichnosti" : "/admin/nalichnosti?filter=low"}
            variant="outline"
          >
            {onlyLow ? "Покажи всички" : "Само ниска наличност"}
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="Заглавия" value={products.length} />
        <StatTile label="Общо бройки" value={totalUnits} />
        <StatTile
          label="Ниска наличност"
          value={lowStock.length}
          tone={lowStock.length > 0 ? "warning" : "default"}
        />
        <StatTile
          label="Изчерпани"
          value={outOfStock.length}
          tone={outOfStock.length > 0 ? "destructive" : "default"}
        />
      </div>

      {stockValue > 0 && (
        <p className="mb-6 text-sm text-muted-foreground">
          Стойност на наличната стока по продажни цени:{" "}
          <strong className="text-foreground">{formatPrice(stockValue)}</strong>
        </p>
      )}

      {visible.length === 0 ? (
        <AdminEmpty
          title={onlyLow ? "Няма заглавия с ниска наличност" : "Още няма физически книги"}
          description={
            onlyLow
              ? "Всички книги са с достатъчна наличност."
              : "Добавете физическа книга, за да управлявате наличности."
          }
          action={
            !onlyLow ? (
              <ButtonLink href="/admin/produkti/nov">Нов продукт</ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <Th className="w-14" />
              <Th>Заглавие</Th>
              <Th className="text-center">Наличност</Th>
              <Th className="text-center">Праг</Th>
              <Th>Статус</Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((p) => {
              const cover = publicUrl(p.coverImage);
              const isLow = p.stock <= p.lowStockAlert;
              const isOut = p.stock === 0;

              return (
                <tr key={p.id} className="hover:bg-muted/50 transition-colors">
                  <Td>
                    <div className="relative w-9 h-12 bg-muted rounded-sm overflow-hidden border border-border">
                      {cover && (
                        <Image src={cover} alt="" fill sizes="36px" className="object-cover" />
                      )}
                    </div>
                  </Td>

                  <Td>
                    <Link
                      href={`/admin/produkti/${p.id}`}
                      className="font-sans font-bold hover:text-primary transition-colors"
                    >
                      {p.title}
                    </Link>
                    {p.author && (
                      <p className="text-xs text-muted-foreground">{p.author}</p>
                    )}
                  </Td>

                  <Td className="text-center">
                    <StockEditor
                      productId={p.id}
                      initial={p.stock}
                      field="stock"
                    />
                  </Td>

                  <Td className="text-center">
                    <StockEditor
                      productId={p.id}
                      initial={p.lowStockAlert}
                      field="lowStockAlert"
                    />
                  </Td>

                  <Td>
                    {isOut ? (
                      <Badge tone="destructive">Изчерпана</Badge>
                    ) : isLow ? (
                      <Badge tone="warning">Ниска наличност</Badge>
                    ) : (
                      <Badge tone="success">Налична</Badge>
                    )}
                    {!p.isPublished && (
                      <Badge tone="default" className="ml-1">
                        Скрита
                      </Badge>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
