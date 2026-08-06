"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Декоративно видео в hero секцията.
 *
 * Изисквания на браузърите за автоматично пускане: видеото трябва да е без
 * звук и с `playsInline` — иначе iOS го отваря на цял екран, а останалите
 * браузъри просто отказват да го пуснат.
 *
 * Видеото е украса, не съдържание: скрито е за екранни четци и не се пуска
 * при включено „намалено движение“ в системните настройки.
 */
export function HeroVideo({
  src,
  poster,
}: {
  src: string;
  poster?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const apply = () => {
      if (reduced.matches) {
        video.pause();
        video.currentTime = 0;
      } else {
        // Обещанието се отхвърля, ако браузърът блокира автоматичното пускане —
        // тогава остава постерът, което е напълно приемливо.
        void video.play().catch(() => {});
      }
    };

    apply();
    reduced.addEventListener("change", apply);
    return () => reduced.removeEventListener("change", apply);
  }, []);

  if (failed) return null;

  return (
    <div
      aria-hidden="true"
      className="relative aspect-video w-full overflow-hidden rounded-md border border-border shadow-lift bg-muted"
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        muted
        loop
        playsInline
        preload="metadata"
        tabIndex={-1}
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />

      {/* Лек топъл слой, за да се слее видеото с палитрата на сайта. */}
      <div
        className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-25"
        style={{
          background:
            "linear-gradient(135deg, var(--accent) 0%, transparent 55%, var(--secondary) 100%)",
        }}
      />
    </div>
  );
}
