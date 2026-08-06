import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { AdminHeader } from "@/components/admin/admin-ui";
import { BundleForm } from "@/components/admin/bundle-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редакция на комплект",
  robots: { index: false, follow: false },
};

export default async function EditBundlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bundle, products] = await Promise.all([
    db.bundle.findUnique({
      where: { id },
      include: { items: { select: { productId: true } } },
    }),
    db.product.findMany({
      where: { type: "PHYSICAL", isPublished: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true, priceCents: true, coverImage: true },
    }),
  ]);

  if (!bundle) notFound();

  return (
    <div>
      <AdminHeader title="Редакция на комплект" description={bundle.title} />

      <BundleForm
        products={products.map((p) => ({ ...p, coverImage: publicUrl(p.coverImage) }))}
        bundle={{
          id: bundle.id,
          title: bundle.title,
          slug: bundle.slug,
          description: bundle.description,
          price: (bundle.priceCents / 100).toFixed(2),
          isPublished: bundle.isPublished,
          coverUrl: publicUrl(bundle.coverImage),
          productIds: bundle.items.map((i) => i.productId),
        }}
      />
    </div>
  );
}
