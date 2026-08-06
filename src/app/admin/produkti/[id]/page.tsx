import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { AdminHeader } from "@/components/admin/admin-ui";
import { ProductForm } from "@/components/admin/product-form";
import { ButtonLink } from "@/components/ui";
import { productHref } from "@/components/product-card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редакция на продукт",
  robots: { index: false, follow: false },
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [product, categories, allProducts] = await Promise.all([
    db.product.findUnique({
      where: { id },
      include: {
        relatedTo: { select: { targetId: true } },
        images: { orderBy: { order: "asc" }, select: { id: true, url: true } },
      },
    }),
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

  if (!product) notFound();

  return (
    <div>
      <AdminHeader
        title="Редакция на продукт"
        description={product.title}
        action={
          <ButtonLink
            href={productHref(product)}
            target="_blank"
            variant="outline"
          >
            Виж в сайта ↗
          </ButtonLink>
        }
      />

      <ProductForm
        categories={categories}
        allProducts={allProducts}
        product={{
          id: product.id,
          type: product.type,
          title: product.title,
          slug: product.slug,
          author: product.author ?? "",
          description: product.description,
          shortDesc: product.shortDesc ?? "",
          price: (product.priceCents / 100).toFixed(2),
          compareAt: product.compareAtCents
            ? (product.compareAtCents / 100).toFixed(2)
            : "",
          stock: product.stock,
          lowStockAlert: product.lowStockAlert,
          durationSeconds: product.durationSeconds,
          previewPages: product.previewPages ?? 0,
          categoryId: product.categoryId ?? "",
          isPublished: product.isPublished,
          isFeatured: product.isFeatured,
          isBestseller: product.isBestseller,
          isFree: product.isFree,
          metaTitle: product.metaTitle ?? "",
          metaDescription: product.metaDescription ?? "",
          coverUrl: publicUrl(product.coverImage),
          hasFile: Boolean(product.fileKey),
          hasPreview: Boolean(product.previewKey),
          relatedIds: product.relatedTo.map((r) => r.targetId),
          gallery: product.images
            .map((i) => ({ id: i.id, url: publicUrl(i.url) }))
            .filter((i): i is { id: string; url: string } => Boolean(i.url)),
        }}
      />
    </div>
  );
}
