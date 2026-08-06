import type { Metadata } from "next";
import { db } from "@/lib/db";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Нов продукт",
  robots: { index: false, follow: false },
};

export default async function NewProductPage() {
  const [categories, allProducts] = await Promise.all([
    db.category.findMany({
      orderBy: [{ order: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    db.product.findMany({
      where: { isPublished: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, type: true },
      take: 200,
    }),
  ]);

  return (
    <div>
      <AdminHeader
        title="Нов продукт"
        description="Попълнете данните и качете файловете. Можете да запазите като чернова и да публикувате по-късно."
      />
      <ProductForm categories={categories} allProducts={allProducts} />
    </div>
  );
}
