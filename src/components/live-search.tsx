"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloseIcon, SearchIcon } from "./icons";
import { formatPrice } from "@/lib/format";

type SearchResult = {
  id: string;
  kind: "product" | "post";
  title: string;
  subtitle: string | null;
  href: string;
  image: string | null;
  priceCents: number | null;
  typeLabel: string;
};

/**
 * Глобална търсачка с резултати при писане.
 *
 * Заявките се дебоунсват на 250 ms и всяка нова заявка отменя предишната
 * (AbortController), за да не се показват резултати от изостанал отговор.
 */
export function LiveSearch({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        // Ако заявката е отменена, вече тече по-нова — не гасим индикатора.
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        router.push(results[activeIndex].href);
        onClose();
      } else if (query.trim().length >= 2) {
        router.push(`/tarsene?q=${encodeURIComponent(query.trim())}`);
        onClose();
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/25 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Търсене в сайта"
    >
      <div
        className="container-page pt-[10vh] max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-card border border-border rounded-md shadow-lift overflow-hidden">
          <div className="flex items-center gap-3 px-4 border-b border-border">
            <SearchIcon className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Търсене по заглавие, автор или ключова дума…"
              className="flex-1 h-14 bg-transparent text-base outline-none placeholder:text-muted-foreground/70"
              aria-label="Търсене"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Затвори търсенето"
              className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted shrink-0"
            >
              <CloseIcon size={18} />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                Търсене…
              </p>
            )}

            {!loading && query.trim().length >= 2 && results.length === 0 && (
              <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                Няма намерени резултати за „{query.trim()}“.
              </p>
            )}

            {!loading && query.trim().length < 2 && (
              <p className="px-4 py-8 text-sm text-muted-foreground text-center">
                Въведете поне 2 символа за търсене.
              </p>
            )}

            {results.map((r, i) => (
              <Link
                key={`${r.kind}-${r.id}`}
                href={r.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 transition-colors ${
                  i === activeIndex ? "bg-muted" : "hover:bg-muted/60"
                }`}
              >
                <div className="w-10 h-14 shrink-0 bg-muted rounded-sm overflow-hidden relative">
                  {r.image && (
                    <Image
                      src={r.image}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-sans text-sm font-bold truncate">{r.title}</div>
                  {r.subtitle && (
                    <div className="text-xs text-muted-foreground truncate">
                      {r.subtitle}
                    </div>
                  )}
                  <div className="text-[11px] font-sans uppercase tracking-wider text-primary mt-0.5">
                    {r.typeLabel}
                  </div>
                </div>
                {r.priceCents !== null && (
                  <div className="font-sans text-sm font-bold whitespace-nowrap">
                    {formatPrice(r.priceCents)}
                  </div>
                )}
              </Link>
            ))}

            {results.length > 0 && (
              <Link
                href={`/tarsene?q=${encodeURIComponent(query.trim())}`}
                onClick={onClose}
                className="block px-4 py-3 text-center font-sans text-sm font-bold text-primary hover:bg-muted transition-colors"
              >
                Виж всички резултати →
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
