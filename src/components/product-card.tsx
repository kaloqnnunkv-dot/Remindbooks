import Image from "next/image";
import Link from "next/link";
import type { ProductType } from "@prisma/client";
import { formatPrice, formatDuration, discountPercent } from "@/lib/format";
import { Badge, Stars } from "./ui";
import { AddToCartButton } from "./add-to-cart";
import { FavoriteButton } from "./favorite-button";
import { HeadphonesIcon } from "./icons";

export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  type: ProductType;
  priceCents: number;
  compareAtCents: number | null;
  coverImage: string | null;
  stock: number;
  isFree: boolean;
  isBestseller: boolean;
  isFeatured: boolean;
  durationSeconds: number | null;
  avgRating?: number | null;
  reviewCount?: number;
};

export function productHref(p: { type: ProductType; slug: string }): string {
  const base =
    p.type === "PHYSICAL" ? "/knigi" : p.type === "PDF" ? "/pdf" : "/audio";
  return `${base}/${p.slug}`;
}

export function ProductCard({
  product,
  isFavorite = false,
  showFavorite = true,
  priority = false,
}: {
  product: ProductCardData;
  isFavorite?: boolean;
  showFavorite?: boolean;
  priority?: boolean;
}) {
  const href = productHref(product);
  const discount = discountPercent(product.priceCents, product.compareAtCents);
  const outOfStock = product.type === "PHYSICAL" && product.stock <= 0;
  const lowStock =
    product.type === "PHYSICAL" && product.stock > 0 && product.stock <= 3;

  return (
    <article className="group flex flex-col h-full">
      <div className="relative">
        <Link
          href={href}
          className="block relative aspect-[2/3] bg-muted rounded-md overflow-hidden border border-border"
        >
          {product.coverImage ? (
            <Image
              src={product.coverImage}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              priority={priority}
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              {product.type === "AUDIO" ? (
                <HeadphonesIcon size={36} />
              ) : (
                <span className="font-sans text-xs px-4 text-center">{product.title}</span>
              )}
            </div>
          )}

          {/* Значки */}
          <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
            {discount && <Badge tone="destructive">−{discount}%</Badge>}
            {product.isBestseller && <Badge tone="primary">Най-продавана</Badge>}
            {product.isFree && <Badge tone="success">Безплатно</Badge>}
          </div>

          {outOfStock && (
            <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
              <span className="font-sans text-xs font-bold uppercase tracking-wider px-3 py-1.5 bg-card border border-border rounded-sm">
                Изчерпана
              </span>
            </div>
          )}
        </Link>

        {showFavorite && (
          <div className="absolute top-2 right-2">
            <FavoriteButton productId={product.id} initial={isFavorite} compact />
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 pt-3">
        <Link href={href} className="group/title">
          <h3 className="font-sans text-sm font-bold leading-snug line-clamp-2 group-hover/title:text-primary transition-colors">
            {product.title}
          </h3>
        </Link>

        {product.author && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
            {product.author}
          </p>
        )}

        {product.type === "AUDIO" && product.durationSeconds ? (
          <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
            <HeadphonesIcon size={13} />
            {formatDuration(product.durationSeconds)}
          </p>
        ) : null}

        {product.reviewCount ? (
          <div className="mt-1.5 flex items-center gap-1.5">
            <Stars rating={product.avgRating ?? 0} size={12} />
            <span className="text-[11px] text-muted-foreground">
              ({product.reviewCount})
            </span>
          </div>
        ) : null}

        {lowStock && (
          <p className="mt-1.5 text-xs text-warning font-sans font-bold">
            Остават само {product.stock}
          </p>
        )}

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div className="flex flex-col">
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtCents)}
              </span>
            )}
            <span className="font-sans font-bold text-base">
              {product.isFree ? "Безплатно" : formatPrice(product.priceCents)}
            </span>
          </div>

          <AddToCartButton
            productId={product.id}
            type={product.type}
            isFree={product.isFree}
            disabled={outOfStock}
            slug={product.slug}
            size="sm"
          />
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-9">
      {children}
    </div>
  );
}
