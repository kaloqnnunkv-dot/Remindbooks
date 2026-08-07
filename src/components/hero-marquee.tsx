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
 * Влиза отляво, обикаля пълен кръг в средата и излиза надясно. Средната част
 * е истинска окръжност — център (470, 150) и радиус 105 — съставена от четири
 * четвъртини по правилото на Безие (контролните точки отстоят на 0.5523·R по
 * допирателната). Затова примката е кръгла, а не яйцевидна.
 *
 * Входът и изходът се допират до окръжността хоризонтално, за да няма чупка:
 * при `offset-rotate: auto` всяка чупка би завъртяла рязко корицата.
 */
const PATH =
  "M1 209.434C140 285 400 256 470 255C528 255 575 208 575 150C575 92 528 45 470 45C412 45 365 92 365 150C365 208 412 255 470 255C540 253 830 135 995 156.5";

/** Над колко пиксела движение жестът се смята за влачене, а не за щракване. */
const DRAG_THRESHOLD = 6;

/** Ширина на корица в координатите на кривата (виж CAPACITY). */
const CARD_WIDTH = 57.6;
/** Желан просвет между две съседни корици. */
const GAP = 2;

/**
 * Колко корици побира кривата при зададения просвет.
 *
 * Лентата разпределя елементите равномерно по дължината на кривата, затова
 * разстоянието между центровете е дължина / брой. Дължината на PATH е 1673.3
 * единици (числено интегриране на шестте криви), тоест 1673.3 / (57.6 + 2)
 * ≈ 28 корици оставят точно 2 единици просвет. Повече елементи биха се
 * припокрили, по-малко — биха се разредили.
 */
const CAPACITY = Math.floor(1673.3 / (CARD_WIDTH + GAP));

export function HeroMarquee({ products }: { products: MarqueeProduct[] }) {
  const router = useRouter();
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const pointerHref = useRef<string | null>(null);
  const dragged = useRef(false);

  if (products.length === 0) return null;

  // Излишните заглавия биха се струпали по кривата; при по-малко — повтаряме,
  // докато я запълним.
  const shown = products.slice(0, CAPACITY);
  const repeat = Math.max(1, Math.round(CAPACITY / shown.length));

  return (
    <div
      className="absolute inset-0"
      // Проследяваме жеста още при прихващане, защото лентата прихваща
      // показалеца (setPointerCapture) и оттам нататък всички събития —
      // включително click — се насочват към нея, а не към корицата. Затова и
      // адресът се запомня още при натискането, докато целта е самата корица.
      onPointerDownCapture={(e) => {
        pointerStart.current = { x: e.clientX, y: e.clientY };
        pointerHref.current =
          (e.target as Element | null)
            ?.closest<HTMLElement>("[data-product-href]")
            ?.dataset.productHref ?? null;
        dragged.current = false;
      }}
      onPointerMoveCapture={(e) => {
        const start = pointerStart.current;
        if (!start) return;
        if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > DRAG_THRESHOLD) {
          dragged.current = true;
        }
      }}
      onClick={() => {
        // Влаченето върти лентата и не бива да отваря продукта;
        // краткото щракване — да.
        const href = pointerHref.current;
        if (href && !dragged.current) router.push(href);
      }}
    >
      <MarqueeAlongSvgPath
        path={PATH}
        viewBox="0 0 996 330"
        baseVelocity={7}
        repeat={repeat}
        slowdownOnHover
        slowDownFactor={0.25}
        draggable
        grabCursor
        dragSensitivity={0.08}
        responsive
        className="h-full w-full scale-105"
      >
        {shown.map((product) => (
          <a
            key={product.id}
            href={productHref(product)}
            data-product-href={productHref(product)}
            tabIndex={-1}
            /* Браузърът влачи връзките по подразбиране и показва до курсора
               балонче с адреса. Тук влаченето върти лентата, затова
               собственото поведение на браузъра се изключва. */
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onClick={(e) => e.preventDefault()}
            style={{ width: `${CARD_WIDTH}px` }}
            className="block cursor-pointer transition-transform duration-300 ease-out hover:scale-125"
          >
            {/* Съотношението е заковано тук, а не се взима от файла — така
                всички корици са еднакви правоъгълници, независимо дали
                качената снимка е квадратна или широка. */}
            <span className="block aspect-[2/3] overflow-hidden rounded-sm border border-border bg-card shadow-lift">
              {product.coverImage ? (
                <Image
                  src={product.coverImage}
                  alt={product.title}
                  width={192}
                  height={288}
                  draggable={false}
                  className="pointer-events-none h-full w-full select-none object-contain"
                />
              ) : (
                <span className="flex h-full w-full select-none items-center justify-center px-1 text-center font-sans text-[7px] leading-[1.15] text-muted-foreground">
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
