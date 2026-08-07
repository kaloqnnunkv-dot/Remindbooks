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
 * Кривата, по която обикалят кориците.
 *
 * Влиза отляво, извива се в примка в средата и излиза надясно. Примката е
 * същината на ефекта: там кориците се застъпват и се въртят една около друга.
 */
const PATH =
  "M1 209.434C58.5872 255.935 387.926 325.938 482.583 209.434C600.905 63.8051 525.516 -43.2211 427.332 19.9613C329.149 83.1436 352.902 242.723 515.041 267.302C644.752 286.966 943.56 181.94 995 156.5";

export function HeroMarquee({ products }: { products: MarqueeProduct[] }) {
  if (products.length === 0) return null;

  return (
    <div className="absolute inset-0">
      <MarqueeAlongSvgPath
        path={PATH}
        viewBox="0 0 996 330"
        baseVelocity={7}
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
