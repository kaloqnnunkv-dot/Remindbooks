"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ProductType } from "@prisma/client";
import { AddToCartButton } from "@/components/add-to-cart";
import { PHASES, PHASE_ORDER, type Phase } from "@/lib/daylight";
import { formatDuration } from "@/lib/format";
import { Cover, Price, Tags, lowStock, outOfStock, type HomeItem } from "./shared";

export type ShelfFilter = "all" | ProductType;

type HomeContextValue = {
  items: HomeItem[];
  recs: Record<Phase, HomeItem[]>;
  filter: ShelfFilter;
  setFilter: (f: ShelfFilter) => void;
  openBook: (item: HomeItem) => void;
};

const HomeContext = createContext<HomeContextValue | null>(null);

export function useHome(): HomeContextValue {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error("useHome трябва да се ползва вътре в <HomeProvider>.");
  return ctx;
}

export function HomeProvider({
  items,
  recIds,
  children,
}: {
  items: HomeItem[];
  recIds: Record<Phase, string[]>;
  children: React.ReactNode;
}) {
  const [filter, setFilter] = useState<ShelfFilter>("all");
  const [open, setOpen] = useState<HomeItem | null>(null);

  const recs = useMemo(() => {
    const byId = new Map(items.map((i) => [i.id, i]));
    const out = {} as Record<Phase, HomeItem[]>;
    for (const p of PHASE_ORDER) out[p] = recIds[p].map((id) => byId.get(id)).filter((x): x is HomeItem => Boolean(x));
    return out;
  }, [items, recIds]);

  const openBook = useCallback((item: HomeItem) => setOpen(item), []);

  const value = useMemo(
    () => ({ items, recs, filter, setFilter, openBook }),
    [items, recs, filter, openBook],
  );

  return (
    <HomeContext.Provider value={value}>
      {children}
      {open && <BookSheet item={open} recIds={recIds} onClose={() => setOpen(null)} />}
    </HomeContext.Provider>
  );
}

/** Прозорецът с книга: корица, описание, цена и бутон за кошницата. */
function BookSheet({
  item,
  recIds,
  onClose,
}: {
  item: HomeItem;
  recIds: Record<Phase, string[]>;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<Element | null>(null);

  const close = useCallback(() => {
    setShown(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(onClose, reduce ? 0 : 250);
  }, [onClose]);

  useEffect(() => {
    lastFocus.current = document.activeElement;
    const raf = requestAnimationFrame(() => setShown(true));
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
      if (lastFocus.current instanceof HTMLElement) lastFocus.current.focus();
    };
  }, [close]);

  const fits = PHASE_ORDER.find((p) => recIds[p].includes(item.id));

  return (
    <div
      className={`rb-scrim${shown ? " show" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="rb-sheet" role="dialog" aria-modal="true" aria-labelledby="rb-sheet-title">
        <button ref={closeRef} type="button" className="rb-x" onClick={close} aria-label="Затвори">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div>
          <div className="bk">
            <Cover item={item} sizes="(max-width: 980px) 220px, 340px" />
          </div>
        </div>
        <div>
          <Tags item={item} />
          <h3 id="rb-sheet-title">{item.title}</h3>
          {item.author && <div className="au">{item.author}</div>}
          <div style={{ margin: "16px 0" }}>
            <Price item={item} />
            {lowStock(item) && <div className="rb-stock">Остават само {item.stock}</div>}
            {item.type === "AUDIO" && item.durationSeconds ? (
              <div className="au" style={{ fontSize: 14 }}>
                Продължителност: {formatDuration(item.durationSeconds)}
              </div>
            ) : null}
          </div>
          {fits && <div className="why">{PHASES[fits].why}</div>}
          {item.blurb && <p>{item.blurb}</p>}
          <div className="row">
            <AddToCartButton
              productId={item.id}
              type={item.type}
              isFree={item.isFree}
              slug={item.slug}
              disabled={outOfStock(item)}
              size="lg"
            />
            <Link className="btn ghost" href={item.href}>
              Виж страницата
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
