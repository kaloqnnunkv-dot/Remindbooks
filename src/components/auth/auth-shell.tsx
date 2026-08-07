"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Logo } from "../logo";

/**
 * Двупанелна рамка за страниците за вход и регистрация.
 *
 * Отляво е формата, отдясно — визуален панел. Панелът се скрива под lg:
 * на тесен екран формата трябва да заема цялата ширина, а декорацията само би
 * отблъснала полетата надолу.
 *
 * Разсеяното сияние следва курсора. Използва `transform` вместо промяна на
 * позицията, за да не предизвиква преизчисляване на оформлението, и се
 * изключва при „намалено движение“.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  video,
  quote,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** Декоративно видео за десния панел; при липса остава градиентът. */
  video?: string | null;
  quote?: string;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  return (
    <div className="container-page py-10 lg:py-16">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-md border border-border bg-card shadow-lift lg:grid-cols-2">
        {/* Форма */}
        <div
          className="relative overflow-hidden px-6 py-10 sm:px-10 lg:px-12 lg:py-14"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute h-[420px] w-[420px] rounded-full blur-3xl transition-opacity duration-300 motion-reduce:hidden ${
              hovering ? "opacity-100" : "opacity-0"
            }`}
            style={{
              background:
                "radial-gradient(circle, color-mix(in srgb, var(--primary) 22%, transparent) 0%, transparent 70%)",
              transform: `translate(${pos.x - 210}px, ${pos.y - 210}px)`,
              transition: "transform 0.12s ease-out, opacity 0.3s",
            }}
          />

          <div className="relative z-10">
            <Logo width={150} className="h-9" />

            <h1 className="mt-8 text-3xl font-extrabold sm:text-4xl">{title}</h1>
            {subtitle && (
              <p className="mt-3 leading-relaxed text-muted-foreground">{subtitle}</p>
            )}

            <div className="mt-8">{children}</div>

            {footer && <div className="mt-8">{footer}</div>}
          </div>
        </div>

        {/* Визуален панел */}
        <div className="relative hidden overflow-hidden border-l border-border bg-muted lg:block">
          {video ? (
            <video
              src={video}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              aria-hidden="true"
              tabIndex={-1}
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
          ) : (
            <Image
              src="/logo-mark.png"
              alt=""
              width={512}
              height={512}
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 w-2/3 -translate-x-1/2 -translate-y-1/2 opacity-10"
            />
          )}

          {/* Топъл слой, за да се слее панелът с палитрата */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(150deg, color-mix(in srgb, var(--accent) 70%, transparent) 0%, color-mix(in srgb, var(--secondary) 55%, transparent) 55%, color-mix(in srgb, var(--primary) 30%, transparent) 100%)",
            }}
          />

          <div className="relative z-10 flex h-full flex-col justify-end p-12">
            <blockquote className="text-2xl leading-snug text-foreground">
              {quote ?? "Книги, които връщат посоката."}
            </blockquote>
            <p className="mt-4 font-sans text-xs font-bold uppercase tracking-[0.15em] text-foreground/70">
              Remind Books
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
