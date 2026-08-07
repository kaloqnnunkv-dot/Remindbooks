"use client";

import Image from "next/image";
import Link from "next/link";
import MarqueeAlongSvgPath from "./marquee-along-svg-path";
import { productHref } from "./product-card";
import type { ProductType } from "@prisma/client";

export type MarqueeProduct = {
  id: string;
  slug: string;
  title: string;
  type: ProductType;
  coverImage: string | null;
};

/**
 * Кривата, по която се движат кориците.
 *
 * Начертана е така, че да минава ниско вляво и да се издига надясно — горният
 * ляв ъгъл остава свободен за заглавието. Иначе кориците биха преминавали
 * върху текста и биха го направили нечетим.
 */
const PATH =
  "M-40 470 C 160 560, 340 520, 520 400 C 700 280, 660 120, 810 150 C 960 180, 920 380, 1070 396 C 1180 408, 1230 300, 1260 236";

export function HeroMarquee({ products }: { products: MarqueeProduct[] }) {
  if (products.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <MarqueeAlongSvgPath
        path={PATH}
        viewBox="0 0 1200 560"
        baseVelocity={6}
        repeat={products.length < 6 ? 3 : 2}
        slowdownOnHover
        slowDownFactor={0.25}
        draggable
        grabCursor
        dragSensitivity={0.08}
        responsive
        className="h-full w-full"
      >
        {products.map((product) => (
          <Link
            key={product.id}
            href={productHref(product)}
            tabIndex={-1}
            className="pointer-events-auto block w-16 transition-transform duration-300 ease-out hover:scale-125 sm:w-20"
          >
            <span className="block overflow-hidden rounded-sm border border-border bg-card shadow-lift">
              {product.coverImage ? (
                <Image
                  src={product.coverImage}
                  alt=""
                  width={160}
                  height={240}
                  draggable={false}
                  className="h-auto w-full object-cover"
                />
              ) : (
                <span className="flex aspect-[2/3] items-center justify-center px-1 text-center font-sans text-[8px] leading-tight text-muted-foreground">
                  {product.title}
                </span>
              )}
            </span>
          </Link>
        ))}
      </MarqueeAlongSvgPath>
    </div>
  );
}
