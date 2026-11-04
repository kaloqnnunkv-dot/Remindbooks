"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { priceLabel, type HomeItem } from "./shared";

export const PDF_PERKS = [
  "Мигновен достъп веднага след плащането",
  "Линк за сваляне на вашия имейл",
  "Достъп завинаги от профила ви",
  "Без адрес за доставка и без задължителна регистрация",
];

export type PdfFeature = {
  item: HomeItem;
  /** Абзаци от описанието, без HTML. */
  paragraphs: string[];
  quote: string | null;
};

/**
 * PDF секцията: списъкът с предимства, който се отмята сам, щом се покаже, и
 * разлистваща се книжка с откъс от описанието на едно PDF заглавие.
 */
export function PdfTeaser({ feature }: { feature: PdfFeature | null }) {
  const perksRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(0);

  useEffect(() => {
    const el = perksRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];
    const run = () =>
      PDF_PERKS.forEach((_, i) => {
        timers.push(window.setTimeout(() => setDone((d) => Math.max(d, i + 1)), reduce ? 0 : 250 + i * 350));
      });
    if (!("IntersectionObserver" in window)) {
      run();
      return () => timers.forEach(clearTimeout);
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <>
      <div className="rb-label">Дигитални издания</div>
      <h2 className="rb-sec">PDF книги, които четете веднага</h2>
      <p className="rb-lead">
        Без чакане и без доставка. Плащате с карта и книгата се отключва в профила ви за секунди. Всяко
        заглавие има безплатен откъс, за да прелистите преди да решите.
      </p>
      <div className="pdf">
        <div className="perks glass" ref={perksRef}>
          {PDF_PERKS.map((p, i) => (
            <div key={p} className={`chk${i < done ? " done" : ""}`}>
              <i>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 8.5l3 3 7-7" />
                </svg>
              </i>
              {p}
            </div>
          ))}
          <Link className="btn main" style={{ alignSelf: "flex-start", marginTop: 8 }} href="/pdf">
            Разгледай PDF книгите
          </Link>
        </div>
        {feature && <Flipbook feature={feature} />}
      </div>
    </>
  );
}

function Flipbook({ feature }: { feature: PdfFeature }) {
  const { item, paragraphs, quote } = feature;
  const [page, setPage] = useState(0);

  const first = paragraphs.slice(0, 2);
  const rest = paragraphs.slice(2, 4);
  const old = item.compareAtCents && item.compareAtCents > item.priceCents ? item.compareAtCents : null;

  const leaves: [React.ReactNode, React.ReactNode][] = [
    [
      <>
        <h5>Описание</h5>
        {first.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </>,
      quote ? (
        <>
          <h5>Цитат</h5>
          <p className="q">„{quote}“</p>
        </>
      ) : (
        <>
          <h5>За книгата</h5>
          {rest.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </>
      ),
    ],
    [
      quote && rest.length ? (
        <>
          <h5>Още от книгата</h5>
          {rest.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </>
      ) : (
        <>
          <h5>Как получавате книгата</h5>
          <ol>
            {PDF_PERKS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </>
      ),
      <>
        <h5>{item.title}</h5>
        <p>{item.author ?? "Remind Books"}</p>
        <p style={{ marginTop: "2em" }}>
          <b>{priceLabel(item)}</b> {old ? <s style={{ opacity: 0.6 }}>{formatPrice(old)}</s> : null}
        </p>
      </>,
    ],
    [
      <>
        <h5>Безплатен откъс</h5>
        <p>Първите страници можете да прелистите на страницата на книгата, преди да решите.</p>
      </>,
      <>
        <h5>Край на откъса</h5>
        <p>Продължението ви чака в профила ви, секунди след плащането.</p>
      </>,
    ],
  ];

  const turn = () => setPage((p) => (p < leaves.length ? p + 1 : 0));

  return (
    <div className="flip glass">
      <div className="flipbook">
        <div className="base-left">
          {item.cover ? <Image src={item.cover} alt="" fill sizes="(max-width: 980px) 45vw, 280px" className="object-cover" /> : null}
        </div>
        {leaves.map(([front, back], i) => (
          <div
            key={i}
            className={`leaf${i < page ? " turned" : ""}`}
            style={{ zIndex: i < page ? 10 + i : leaves.length - i }}
          >
            <div className="side">{front}</div>
            <div className="side back">{back}</div>
          </div>
        ))}
      </div>
      <div className="flipctl">
        <div>
          <b style={{ fontFamily: "var(--font-serif)", fontSize: 21 }}>Прелистете преди да купите</b>
          <div style={{ color: "var(--rb-muted)", fontSize: 13.5 }}>
            <Link href={item.href} className="hover:underline underline-offset-2">
              „{item.title}“
            </Link>
            , безплатен откъс
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div className="dots" aria-hidden="true">
            {leaves.map((_, i) => (
              <span key={i} className={i === Math.min(page, leaves.length - 1) ? "on" : ""} />
            ))}
          </div>
          <button type="button" className="btn ghost" onClick={turn}>
            {page === leaves.length ? "Отначало" : "Разлисти"}
          </button>
        </div>
      </div>
    </div>
  );
}
