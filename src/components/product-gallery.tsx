"use client";

import Image from "next/image";
import { useState } from "react";

import { ChevronRightIcon } from "./icons";
import { cn } from "./ui";

/**
 * Снимките на продукта.
 *
 * Обикновен слайдер: стрелки, плъзгане с пръст и миниатюри. Преди тук стоеше
 * триизмерна книга, която се въртеше след пръста — красиво, но объркващо:
 * докосването местеше корицата, вместо да покаже следващата снимка.
 *
 * При една снимка стрелките и миниатюрите изобщо не се появяват.
 */
export function ProductGallery({
  images,
  title,
}: {
  images: { url: string; alt: string | null }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  /** Откъде е започнало плъзгането; null означава, че пръстът не е върху снимката. */
  const [swipeFrom, setSwipeFrom] = useState<number | null>(null);

  const count = images.length;
  const index = Math.min(active, Math.max(0, count - 1));
  const current = images[index];

  const go = (step: number) => {
    if (count < 2) return;
    // Обикаля в кръг — от последната се минава на първата.
    setActive((i) => (i + step + count) % count);
  };

  // Продукт без качена корица пак заема мястото си, вместо да остави дупка.
  if (!current) {
    return (
      <div className="flex aspect-[2/3] items-center justify-center rounded-md border border-border bg-card p-6 text-center">
        <span className="font-sans text-sm text-muted-foreground">{title}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-card"
        onPointerDown={(e) => setSwipeFrom(e.clientX)}
        onPointerUp={(e) => {
          if (swipeFrom === null) return;
          const moved = e.clientX - swipeFrom;
          setSwipeFrom(null);
          // 40px праг: под него жестът е по-скоро натискане, отколкото плъзгане.
          if (Math.abs(moved) > 40) go(moved < 0 ? 1 : -1);
        }}
        onPointerCancel={() => setSwipeFrom(null)}
        // Вертикалното плъзгане остава на страницата, за да се превърта с пръст.
        style={{ touchAction: "pan-y" }}
      >
        <Image
          src={current.url}
          alt={current.alt ?? title}
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          className="object-contain"
          priority
          draggable={false}
        />

        {count > 1 && (
          <>
            <Arrow direction="prev" onClick={() => go(-1)} />
            <Arrow direction="next" onClick={() => go(1)} />

            <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-background/85 px-3 py-1 font-mono text-xs tabular-nums">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Още снимки">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Снимка ${i + 1} от ${count}`}
              aria-current={i === index}
              className={cn(
                "relative aspect-[2/3] overflow-hidden rounded-sm border-2 bg-card transition-colors",
                i === index ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Arrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = direction === "prev";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isPrev ? "Предишна снимка" : "Следваща снимка"}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center",
        "rounded-full border border-border bg-background/85 text-foreground",
        "transition-colors hover:bg-background",
        isPrev ? "left-2" : "right-2",
      )}
    >
      <ChevronRightIcon size={18} className={isPrev ? "rotate-180" : undefined} />
    </button>
  );
}
