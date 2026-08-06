import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PdfReader } from "@/components/pdf-reader";
import { Breadcrumbs } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Четене",
  robots: { index: false, follow: false },
};

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const product = await db.product.findFirst({
    where: { slug, type: "PDF" },
    select: { id: true, title: true, author: true, fileKey: true },
  });

  if (!product?.fileKey) notFound();

  // Достъп само за притежатели. Администраторите могат да преглеждат всичко,
  // за да проверят как изглежда книгата след качване.
  const entitlement = await db.entitlement.findUnique({
    where: { userId_productId: { userId, productId: product.id } },
    select: { id: true },
  });

  if (!entitlement && session!.user.role !== "ADMIN") {
    redirect(`/pdf/${slug}`);
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Профил", href: "/profil" },
          { label: "Моите книги", href: "/profil/moite-knigi" },
          { label: product.title },
        ]}
      />

      <PdfReader
        productId={product.id}
        title={product.title}
        author={product.author}
      />
    </div>
  );
}
