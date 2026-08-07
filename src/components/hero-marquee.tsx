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
 * Затворена крива, по която обикалят кориците.
 *
 * Затворена, а не отворена: при отворена крива елементите изникват в единия
 * край и изчезват в другия. По затворен контур движението е непрекъснато —
 * кориците просто обикалят.
 *
 * Леко неправилният овал изглежда по-живо от идеалната елипса.
 */
const PATH =
  "M 600 56 C 900 46, 1150 120, 1140 214 C 1130 312, 860 366, 592 358 C 322 350, 58 300, 62 206 C 66 112, 300 66, 600 56 Z";

export function HeroMarquee({ products }: { products: MarqueeProduct[] }) {
  if (products.length === 0) return null;

  return (
    <div className="absolute inset-0">
      <MarqueeAlongSvgPath
        path={PATH}
        viewBox="0 0 1200 420"
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
            className="block w-16 transition-transform duration-300 ease-out hover:scale-125 sm:w-20"
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
