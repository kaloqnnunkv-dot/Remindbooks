import type { Metadata } from "next";

import { db } from "@/lib/db";
import { AdminHeader, AdminTable, Th, Td, AdminEmpty } from "@/components/admin/admin-ui";
import { CategoryForm } from "@/components/admin/category-form";
import { CategoryRowActions } from "@/components/admin/category-row-actions";
import { ButtonLink, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Категории",
  robots: { index: false, follow: false },
};

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <AdminHeader
        title="Категории"
        description="Категориите се използват за филтриране в каталога и за подбор на свързани заглавия."
        action={
          <ButtonLink href="/admin/produkti" variant="ghost">
            ← Продукти
          </ButtonLink>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {categories.length === 0 ? (
            <AdminEmpty
              title="Още няма категории"
              description="Създайте първата категория с формата вдясно."
            />
          ) : (
            <AdminTable>
              <thead>
                <tr>
                  <Th>Име</Th>
                  <Th>URL адрес</Th>
                  <Th className="text-center">Продукти</Th>
                  <Th className="text-center">Ред</Th>
                  <Th className="text-right">Действия</Th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="hover:bg-muted/50 transition-colors">
                    <Td className="font-sans font-bold">{category.name}</Td>
                    <Td className="font-mono text-xs text-muted-foreground">
                      {category.slug}
                    </Td>
                    <Td className="text-center tabular-nums">
                      {category._count.products}
                    </Td>
                    <Td className="text-center tabular-nums text-muted-foreground">
                      {category.order}
                    </Td>
                    <Td className="text-right">
                      <CategoryRowActions
                        categoryId={category.id}
                        productCount={category._count.products}
                      />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </AdminTable>
          )}
        </div>

        <aside className="lg:col-span-1">
          <Card className="p-6 lg:sticky lg:top-24">
            <h2 className="font-sans text-lg font-bold mb-4">Нова категория</h2>
            <CategoryForm />
          </Card>
        </aside>
      </div>
    </div>
  );
}
