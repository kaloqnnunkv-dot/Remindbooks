"use client";

import Image from "next/image";
import { useState } from "react";
import { Book3D } from "./book-3d";

/**
 * Галерия с триизмерна книга и миниатюри.
 *
 * Основната снимка стои върху самата книга — може да се върти и да ѝ се
 * открехват капаците. Миниатюрите сменят коя снимка е сложена на корицата;
 * при една снимка изобщо не се показват.
 */
export function ProductGallery({
  images,
  title,
}: {
  images: { url: string; alt: string | null }[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];

  return (
    <div className="space-y-3">
      <Book3D cover={current?.url ?? null} title={title} />

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
