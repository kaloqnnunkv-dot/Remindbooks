import type { Metadata } from "next";
import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { AdminHeader } from "@/components/admin/admin-ui";
import { BundleForm } from "@/components/admin/bundle-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Нов комплект",
  robots: { index: false, follow: false },
};

export default async function NewBundlePage() {
  const products = await db.product.findMany({
    where: { type: "PHYSICAL", isPublished: true },
    orderBy: { title: "asc" },
    select: { id: true, title: true, priceCents: true, coverImage: true },
  });

  return (
    <div>
      <AdminHeader
        title="Нов комплект"
        description="Обединете 2 или повече книги на обща, по-изгодна цена."
      />
      <BundleForm
        products={products.map((p) => ({ ...p, coverImage: publicUrl(p.coverImage) }))}
      />
    </div>
  );
}
