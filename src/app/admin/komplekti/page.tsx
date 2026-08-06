import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { formatPrice } from "@/lib/format";
import {
  AdminHeader,
  AdminTable,
  Th,
  Td,
  AdminEmpty,
} from "@/components/admin/admin-ui";
import { BundleRowActions } from "@/components/admin/bundle-row-actions";
import { Badge, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Комплекти",
  robots: { index: false, follow: false },
};

export default async function AdminBundlesPage() {
  const bundles = await db.bundle.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        select: { product: { select: { title: true, priceCents: true } } },
      },
      _count: { select: { orderItems: true } },
    },
  });

  return (
    <div>
      <AdminHeader
        title="Комплекти книги"
        description="Няколко заглавия на обща, по-ниска цена. Показват се в дъното на страницата с физически книги."
        action={<ButtonLink href="/admin/komplekti/nov">Нов комплект</ButtonLink>}
      />

      {bundles.length === 0 ? (
        <AdminEmpty
          title="Още няма комплекти"
          description="Комплектът обединява 2 или повече физически книги на промоционална цена."
          action={<ButtonLink href="/admin/komplekti/nov">Нов комплект</ButtonLink>}
        />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <Th className="w-20" />
              <Th>Заглавие</Th>
              <Th>Съдържание</Th>
              <Th className="text-right">Цена</Th>
              <Th>Статус</Th>
              <Th className="text-right">Действия</Th>
            </tr>
          </thead>
          <tbody>
            {bundles.map((bundle) => {
              const cover = publicUrl(bundle.coverImage);
              const fullPrice = bundle.items.reduce(
                (sum, i) => sum + i.product.priceCents,
                0,
              );
              const savings = fullPrice - bundle.priceCents;

              return (
                <tr key={bundle.id} className="hover:bg-muted/50 transition-colors">
                  <Td>
                    <div className="relative w-16 h-11 bg-muted rounded-sm overflow-hidden border border-border">
                      {cover && (
                        <Image
                          src={cover}
                          alt=""
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      )}
                    </div>
                  </Td>

                  <Td>
                    <Link
                      href={`/admin/komplekti/${bundle.id}`}
                      className="font-sans font-bold hover:text-primary transition-colors"
                    >
                      {bundle.title}
                    </Link>
                    {bundle._count.orderItems > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bundle._count.orderItems}{" "}
                        {bundle._count.orderItems === 1 ? "поръчка" : "поръчки"}
                      </p>
                    )}
                  </Td>

                  <Td>
                    <p className="text-xs text-muted-foreground">
                      {bundle.items.length}{" "}
                      {bundle.items.length === 1 ? "заглавие" : "заглавия"}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {bundle.items.map((i) => i.product.title).join(", ")}
                    </p>
                  </Td>

                  <Td className="text-right whitespace-nowrap">
                    <span className="font-sans font-bold">
                      {formatPrice(bundle.priceCents)}
                    </span>
                    {savings > 0 && (
                      <p className="text-xs text-success">
                        −{formatPrice(savings)}
                      </p>
                    )}
                  </Td>

                  <Td>
                    {bundle.isPublished ? (
                      <Badge tone="success">Публикуван</Badge>
                    ) : (
                      <Badge tone="default">Скрит</Badge>
                    )}
                  </Td>

                  <Td className="text-right">
                    <BundleRowActions
                      bundleId={bundle.id}
                      isPublished={bundle.isPublished}
                      hasOrders={bundle._count.orderItems > 0}
                    />
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
