"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef } from "react";
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

/** Над колко пиксела движение жестът се смята за влачене, а не за щракване. */
const DRAG_THRESHOLD = 6;

export function HeroMarquee({ products }: { products: MarqueeProduct[] }) {
  const router = useRouter();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const dragged = useRef(false);

  if (products.length === 0) return null;

  return (
    <div
      className="absolute inset-0"
      // Проследяваме жеста още при прихващане, защото самата лента спира
      // събитията по-надолу — иначе щракването и влаченето не се различават.
      onPointerDownCapture={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        dragged.current = false;
      }}
      onPointerMoveCapture={(e) => {
        const start = pointerStart.current;
        if (!start) return;
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD) {
          dragged.current = true;
        }
      }}
    >
      <MarqueeAlongSvgPath
        path={PATH}
        viewBox="0 0 996 330"
        baseVelocity={7}
        // По един екземпляр на заглавие — при два кориците се струпваха
        // и примката изглеждаше задръстена.
        repeat={products.length < 8 ? 2 : 1}
        slowdownOnHover
        slowDownFactor={0.25}
        draggable
        grabCursor
        dragSensitivity={0.08}
        responsive
        className="h-full w-full scale-105"
      >
        {products.map((product) => (
          <a
            key={product.id}
            href={productHref(product)}
            tabIndex={-1}
            /* Браузърът влачи връзките по подразбиране и показва до курсора
               балонче с адреса. Тук влаченето върти лентата, затова
               собственото поведение на браузъра се изключва. */
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => {
              e.preventDefault();
              // Влаченето върти лентата и не бива да отваря продукта;
              // краткото щракване — да.
              if (!dragged.current) router.push(productHref(product));
            }}
            className="block w-12 cursor-pointer transition-transform duration-300 ease-out hover:scale-125 sm:w-[3.6rem]"
          >
            <span className="block overflow-hidden rounded-sm border border-border bg-card shadow-lift">
              {product.coverImage ? (
                <Image
                  src={product.coverImage}
                  alt={product.title}
                  width={192}
                  height={288}
                  draggable={false}
                  className="pointer-events-none h-auto w-full select-none object-cover"
                />
              ) : (
                <span className="flex aspect-[2/3] select-none items-center justify-center px-1 text-center font-sans text-[7px] leading-[1.15] text-muted-foreground">
                  <span className="line-clamp-5">{product.title}</span>
                </span>
              )}
            </span>
          </a>
        ))}
      </MarqueeAlongSvgPath>
    </div>
  );
}
