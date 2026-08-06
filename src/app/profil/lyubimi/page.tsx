import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCardData } from "@/lib/queries";
import { ProductCard, ProductGrid } from "@/components/product-card";
import { ButtonLink, EmptyState } from "@/components/ui";
import { HeartIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моите любими",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const session = await auth();

  const favorites = await db.favorite.findMany({
    where: { userId: session!.user.id, product: { isPublished: true } },
    orderBy: { createdAt: "desc" },
    select: {
      product: {
        select: {
          id: true, slug: true, title: true, author: true, type: true,
          priceCents: true, compareAtCents: true, coverImage: true,
          stock: true, isFree: true, isBestseller: true, isFeatured: true,
          durationSeconds: true,
          reviews: { where: { isApproved: true }, select: { rating: true } },
        },
      },
    },
  });

  const items = favorites.map((f) => toCardData(f.product));

  return (
    <div>
      <h1 className="text-3xl rule mb-3">Моите любими</h1>
      <p className="text-muted-foreground mb-8">
        Заглавията, които сте запазили за по-късно. Може да ги добавите в
        кошницата директно оттук.
      </p>

      {items.length === 0 ? (
        <EmptyState
          icon={<HeartIcon size={36} />}
          title="Списъкът ви е празен"
          description="Натиснете сърцето върху всяка книга или аудио материал, за да го запазите тук."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <ButtonLink href="/knigi">Физически книги</ButtonLink>
              <ButtonLink href="/pdf" variant="outline">
                PDF книги
              </ButtonLink>
              <ButtonLink href="/audio" variant="outline">
                Аудио
              </ButtonLink>
            </div>
          }
        />
      ) : (
        <ProductGrid>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} isFavorite />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
