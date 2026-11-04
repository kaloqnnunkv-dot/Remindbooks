import Image from "next/image";
import type { ProductType } from "@prisma/client";
import { formatPrice, discountPercent } from "@/lib/format";
import { cn } from "@/components/ui";

/**
 * Заглавие от каталога, така както го ползва началната страница.
 * Събира се на сървъра (виж `app/page.tsx`), за да стигне до клиента готово.
 */
export type HomeItem = {
  id: string;
  slug: string;
  type: ProductType;
  title: string;
  author: string | null;
  priceCents: number;
  compareAtCents: number | null;
  cover: string | null;
  stock: number;
  isFree: boolean;
  isBestseller: boolean;
  durationSeconds: number | null;
  /** Кратко описание за прозореца с книгата. */
  blurb: string;
  href: string;
  /** Откъдето може да се слуша (откъс или безплатен запис). Само за аудио. */
  audioSrc: string | null;
  /** Цветът и рисунката на генерираната корица, ако няма снимка. */
  hue: number;
  motif: Motif;
};

export const TYPE_LABEL: Record<ProductType, string> = {
  PHYSICAL: "Хартиена",
  PDF: "PDF",
  AUDIO: "Аудио",
};

/** Линейните рисунки за генерираните корици (viewBox 0 0 100 100). */
export const MOTIFS = {
  path: '<path d="M50 96 C50 70 22 64 30 44 S62 24 50 4"/><circle cx="50" cy="4" r="2.5"/>',
  letters: '<rect x="18" y="30" width="64" height="42" rx="3"/><path d="M18 32 L50 56 L82 32"/><path d="M30 82 h40"/>',
  sun: '<circle cx="50" cy="62" r="18"/><path d="M12 62 h76 M50 30 v-14 M24 40 l-9-9 M76 40 l9-9 M20 80 h60 M30 90 h40"/>',
  compass:
    '<circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="30"/><path d="M50 18 L58 50 L50 82 L42 50 Z"/><path d="M50 4 v8 M50 88 v8 M4 50 h8 M88 50 h8"/>',
  arrow: '<path d="M14 80 L78 16 M44 16 h34 v34"/><path d="M14 92 h30"/>',
  shards:
    '<path d="M50 8 L86 40 L66 92 L24 84 L12 34 Z"/><path d="M50 8 L52 50 L86 40 M52 50 L66 92 M52 50 L24 84 M52 50 L12 34"/>',
  mirror: '<ellipse cx="50" cy="42" rx="26" ry="34"/><path d="M50 76 v18 M36 94 h28"/><path d="M38 26 q6-8 14-8"/>',
  waves:
    '<path d="M8 34 q10-12 21 0 t21 0 t21 0 t21 0"/><path d="M8 52 q10-12 21 0 t21 0 t21 0 t21 0"/><path d="M8 70 q10-12 21 0 t21 0 t21 0 t21 0"/>',
  moon: '<path d="M62 14 a36 36 0 1 0 24 58 a30 30 0 1 1-24-58z"/><path d="M24 22 v8 M20 26 h8 M80 22 v6 M77 25 h6"/>',
} as const;

export type Motif = keyof typeof MOTIFS;

export function Cover({
  item,
  sizes = "(max-width: 560px) 50vw, 220px",
  priority,
}: {
  item: HomeItem;
  sizes?: string;
  priority?: boolean;
}) {
  if (item.cover) {
    return <Image src={item.cover} alt="" fill sizes={sizes} priority={priority} className="object-cover" />;
  }
  return (
    <div className="gc" style={{ "--h": item.hue } as React.CSSProperties}>
      <span className="a">{item.author ?? "Remind Books"}</span>
      <svg viewBox="0 0 100 100" aria-hidden="true" dangerouslySetInnerHTML={{ __html: MOTIFS[item.motif] }} />
      <span className="t">{item.title}</span>
    </div>
  );
}

export function Tags({ item, className }: { item: HomeItem; className?: string }) {
  const off = discountPercent(item.priceCents, item.compareAtCents);
  return (
    <div className={cn("rb-tags", className)}>
      {item.isBestseller && <span className="rb-tag best">Най-продавана</span>}
      {off ? <span className="rb-tag off">−{off}%</span> : null}
      {item.isFree && <span className="rb-tag free">Безплатно</span>}
      <span className="rb-tag">{TYPE_LABEL[item.type]}</span>
    </div>
  );
}

export const priceLabel = (item: HomeItem) =>
  item.isFree || item.priceCents === 0 ? "Безплатно" : formatPrice(item.priceCents);

export function Price({ item }: { item: HomeItem }) {
  const old = item.compareAtCents && item.compareAtCents > item.priceCents ? item.compareAtCents : null;
  return (
    <div className="rb-price">
      <b>{priceLabel(item)}</b>
      {old ? <s>{formatPrice(old)}</s> : null}
    </div>
  );
}

/** Остават малко бройки — само за хартиените издания. */
export const lowStock = (item: HomeItem) => item.type === "PHYSICAL" && item.stock > 0 && item.stock <= 3;
export const outOfStock = (item: HomeItem) => item.type === "PHYSICAL" && item.stock <= 0;
