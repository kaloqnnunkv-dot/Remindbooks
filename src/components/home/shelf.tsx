"use client";

import Link from "next/link";
import { useHome, type ShelfFilter } from "./home-context";
import { Cover, Price, Tags, lowStock, outOfStock } from "./shared";
import { formatDuration } from "@/lib/format";

const FORMATS: [ShelfFilter, string, string][] = [
  ["all", "Всички", "/knigi"],
  ["PHYSICAL", "Хартиени", "/knigi"],
  ["PDF", "PDF", "/pdf"],
  ["AUDIO", "Аудио", "/audio"],
];

/**
 * Рафтът с триизмерни книги. Сенките им следват слънцето от пътя на деня
 * (`--sx` и `--night`). Натискане отваря прозореца с книгата.
 */
export function HomeShelf() {
  const { items, filter, setFilter, openBook } = useHome();
  const count = (f: ShelfFilter) => (f === "all" ? items.length : items.filter((b) => b.type === f).length);
  const more = FORMATS.find(([k]) => k === filter)!;

  return (
    <>
      <div className="shelf-head">
        <div>
          <div className="rb-label">Библиотеката</div>
          <h2 className="rb-sec">Всички заглавия</h2>
          <p className="rb-lead">
            Сенките на книгите следват слънцето от компаса. Задръжте мишката над книга, за да я завъртите,
            и натиснете, за да я отворите.
          </p>
        </div>
        <div className="tabs glass" role="tablist" aria-label="Вид издание">
          {FORMATS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={filter === k}
              className={`tab${filter === k ? " on" : ""}`}
              onClick={() => setFilter(k)}
            >
              {label}
              <sup>{count(k)}</sup>
            </button>
          ))}
        </div>
      </div>

      <div className="shelf">
        {items.map((b) => (
          <div key={b.id} className={`item${filter !== "all" && b.type !== filter ? " hide" : ""}`}>
            <button
              type="button"
              className="book-btn"
              onClick={() => openBook(b)}
              aria-label={`${b.title}${b.author ? `, ${b.author}` : ""}. Отвори`}
            >
              <div className="b3d">
                <div className="spine" style={{ background: b.cover ? "#151515" : `hsl(${b.hue} 40% 22%)` }} />
                <div className="pages" />
                <div className="face">
                  <Cover item={b} />
                </div>
              </div>
              <div className="bshadow" />
            </button>
            <Tags item={b} />
            <div>
              <h3>
                <Link href={b.href}>{b.title}</Link>
              </h3>
              <div className="au">
                {b.author}
                {b.durationSeconds ? `${b.author ? ", " : ""}${formatDuration(b.durationSeconds)}` : ""}
              </div>
            </div>
            <Price item={b} />
            {lowStock(b) && <div className="rb-stock">Остават само {b.stock}</div>}
            {outOfStock(b) && <div className="rb-stock">Изчерпана</div>}
          </div>
        ))}
      </div>

      <div className="shelf-more">
        <Link className="btn ghost" href={more[2]}>
          {filter === "all" ? "Целият каталог" : `Всички: ${more[1]}`}
        </Link>
      </div>
    </>
  );
}
