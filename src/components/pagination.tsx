import Link from "next/link";
import { cn } from "./ui";

/**
 * Странициране със запазване на останалите параметри в URL-а
 * (филтър по категория, сортиране, търсене).
 */
export function Pagination({
  page,
  pages,
  basePath,
  searchParams,
}: {
  page: number;
  pages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;

  function hrefFor(target: number): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value && key !== "stranica") params.set(key, value);
    }
    if (target > 1) params.set("stranica", String(target));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  // Показваме до 5 номера около текущата страница.
  const windowSize = 5;
  let start = Math.max(1, page - Math.floor(windowSize / 2));
  const end = Math.min(pages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  const numbers = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const itemClass =
    "min-w-9 h-9 px-2 inline-flex items-center justify-center rounded-md border font-sans text-sm transition-colors";

  return (
    <nav className="mt-12 flex justify-center" aria-label="Страници">
      <ul className="flex items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              rel="prev"
              className={cn(itemClass, "border-border hover:border-primary hover:text-primary")}
              aria-label="Предишна страница"
            >
              ←
            </Link>
          ) : (
            <span className={cn(itemClass, "border-border opacity-40")} aria-hidden="true">
              ←
            </span>
          )}
        </li>

        {start > 1 && (
          <>
            <li>
              <Link href={hrefFor(1)} className={cn(itemClass, "border-border hover:border-primary")}>
                1
              </Link>
            </li>
            {start > 2 && (
              <li className="px-1 text-muted-foreground" aria-hidden="true">
                …
              </li>
            )}
          </>
        )}

        {numbers.map((n) => (
          <li key={n}>
            {n === page ? (
              <span
                aria-current="page"
                className={cn(itemClass, "bg-primary text-primary-foreground border-primary font-bold")}
              >
                {n}
              </span>
            ) : (
              <Link
                href={hrefFor(n)}
                className={cn(itemClass, "border-border hover:border-primary hover:text-primary")}
              >
                {n}
              </Link>
            )}
          </li>
        ))}

        {end < pages && (
          <>
            {end < pages - 1 && (
              <li className="px-1 text-muted-foreground" aria-hidden="true">
                …
              </li>
            )}
            <li>
              <Link
                href={hrefFor(pages)}
                className={cn(itemClass, "border-border hover:border-primary")}
              >
                {pages}
              </Link>
            </li>
          </>
        )}

        <li>
          {page < pages ? (
            <Link
              href={hrefFor(page + 1)}
              rel="next"
              className={cn(itemClass, "border-border hover:border-primary hover:text-primary")}
              aria-label="Следваща страница"
            >
              →
            </Link>
          ) : (
            <span className={cn(itemClass, "border-border opacity-40")} aria-hidden="true">
              →
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
