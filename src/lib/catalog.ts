import type { Prisma } from "@prisma/client";

/**
 * Опции за сортиране в каталозите.
 *
 * Този модул е нарочно отделен от `queries.ts`: контролите за филтриране са
 * клиентски компонент, а `queries.ts` е маркиран със "server-only" (съдържа
 * достъп до базата). Тук няма нищо, което да не може да работи в браузъра —
 * типът от Prisma се изтрива при компилация.
 */

export type SortOption = "newest" | "price-asc" | "price-desc" | "title";

export const SORT_LABELS: Record<SortOption, string> = {
  newest: "Най-нови",
  "price-asc": "Цена: ниска → висока",
  "price-desc": "Цена: висока → ниска",
  title: "Заглавие (А-Я)",
};

export function orderByFor(
  sort: SortOption,
): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price-asc":
      return { priceCents: "asc" };
    case "price-desc":
      return { priceCents: "desc" };
    case "title":
      return { title: "asc" };
    default:
      return { createdAt: "desc" };
  }
}
