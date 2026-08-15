"use client";

import { useState } from "react";
import { Book3D, DEFAULT_TUNING, type BookTuning } from "../book-3d";

/**
 * Книгата плюс регулатори.
 *
 * Регулаторите са само за пробата — за да може усещането да се нагласи на
 * място, вместо да се гадае по числа в кода.
 */
export function BookLab({
  cover,
  title,
  pages = [],
}: {
  cover: string | null;
  title: string;
  pages?: (string | null)[];
}) {
  const [t, setT] = useState<BookTuning>(DEFAULT_TUNING);

  const sliders: { key: keyof BookTuning; label: string; min: number; max: number; step: number }[] =
    [
      { key: "tilt", label: "Наклон след курсора", min: 0, max: 40, step: 1 },
      { key: "openAt", label: "Скорост за пълно отваряне", min: 6, max: 70, step: 1 },
      { key: "maxOpen", label: "Докъде се отваря", min: 20, max: 170, step: 5 },
      { key: "pull", label: "Теглене нагоре/надолу", min: 0, max: 60, step: 2 },
      { key: "idleOpen", label: "Открехване при следване", min: 0, max: 30, step: 1 },
      { key: "readMs", label: "Време за разлистване (мс)", min: 600, max: 4500, step: 100 },
      { key: "ease", label: "Плавност", min: 0.02, max: 0.3, step: 0.01 },
    ];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_280px]">
      <Book3D cover={cover} title={title} pages={pages} tuning={t} />

      <div className="rounded-md border border-border bg-card p-5">
        <p className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Настройки на пробата
        </p>
        <div className="mt-4 space-y-4">
          {sliders.map((sl) => (
            <label key={sl.key} className="block">
              <span className="flex justify-between font-sans text-xs">
                <span>{sl.label}</span>
                <span className="text-muted-foreground">{t[sl.key]}</span>
              </span>
              <input
                type="range"
                min={sl.min}
                max={sl.max}
                step={sl.step}
                value={t[sl.key]}
                onChange={(e) =>
                  setT((prev) => ({ ...prev, [sl.key]: Number(e.target.value) }))
                }
                className="mt-1.5 w-full accent-[var(--primary)]"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setT(DEFAULT_TUNING)}
          className="mt-5 w-full rounded-md border border-border px-3 py-2 font-sans text-xs font-bold hover:bg-muted"
        >
          Върни изходните
        </button>
        <p className="mt-4 font-sans text-xs leading-relaxed text-muted-foreground">
          Кажете ми кои числа ви харесват и ги заковавам.
        </p>
      </div>
    </div>
  );
}
