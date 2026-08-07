"use client";

import Image from "next/image";
import { useState } from "react";
import { BookIcon } from "./icons";

/**
 * Галерия с основно изображение и миниатюри.
 * При една снимка миниатюрите не се показват.
 */
export function ProductGallery({
  images,
  title,
}: {
  images: { url: string; alt: string | null }[];
  title: string;
}) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="aspect-[2/3] bg-card border border-border rounded-md flex items-center justify-center text-muted-foreground">
        <BookIcon size={48} />
      </div>
    );
  }

  const current = images[Math.min(active, images.length - 1)]!;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[2/3] bg-card border border-border rounded-md overflow-hidden">
        <Image
          src={current.url}
          alt={current.alt ?? title}
          fill
          sizes="(max-width: 1024px) 100vw, 40vw"
          priority
          className="object-contain"
        />
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Още снимки">
          {images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Снимка ${i + 1} от ${images.length}`}
              aria-current={i === active}
              className={`relative aspect-[2/3] bg-card rounded-sm overflow-hidden border-2 transition-colors ${
                i === active ? "border-primary" : "border-transparent hover:border-border"
              }`}
            >
              <Image
                src={img.url}
                alt=""
                fill
                sizes="80px"
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
