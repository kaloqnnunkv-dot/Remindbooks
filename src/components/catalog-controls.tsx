"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { SORT_LABELS, type SortOption } from "@/lib/catalog";
import { Select, cn } from "./ui";

type Category = { id: string; name: string; slug: string; _count: { products: number } };

/**
 * Филтри по категория и сортиране.
 *
 * Състоянието живее в URL-а (?kategoria=…&sort=…), а не в React state — така
 * филтрираният изглед е споделяем с линк, работи с бутона "назад" и се
 * индексира от търсачките.
 */
export function CatalogControls({
  categories,
  showCategories = true,
  total,
}: {
  categories: Category[];
  showCategories?: boolean;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentCategory = searchParams.get("kategoria") ?? "";
  const currentSort = (searchParams.get("sort") ?? "newest") as SortOption;

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      // Всяка промяна на филтър връща на първа страница.
      params.delete("stranica");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="mb-8 space-y-4">
      {showCategories && categories.length > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Филтър по категория">
          <FilterChip
            active={currentCategory === ""}
            onClick={() => setParam("kategoria", "")}
          >
            Всички
          </FilterChip>
          {categories
            .filter((c) => c._count.products > 0)
            .map((c) => (
              <FilterChip
                key={c.id}
                active={currentCategory === c.slug}
                onClick={() => setParam("kategoria", c.slug)}
              >
                {c.name}
                <span className="ml-1.5 opacity-60">{c._count.products}</span>
              </FilterChip>
            ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? "Няма намерени заглавия"
            : total === 1
              ? "1 заглавие"
              : `${total} заглавия`}
        </p>

        <div className="flex items-center gap-2">
          <label
            htmlFor="sort"
            className="font-sans text-xs uppercase tracking-wider text-muted-foreground"
          >
            Подреди по
          </label>
          <Select
            id="sort"
            value={currentSort}
            onChange={(e) => setParam("sort", e.target.value)}
            className="w-auto min-w-[11rem]"
          >
            {(Object.keys(SORT_LABELS) as SortOption[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </Select>
        </div>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-3.5 py-1.5 rounded-md border font-sans text-xs font-bold transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-card border-border text-foreground hover:border-primary hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}
