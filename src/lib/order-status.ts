import type { OrderStatus } from "@prisma/client";

export type BadgeTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "destructive"
  | "outline";

/** Цвят на значката според статуса на поръчката. */
export function statusTone(status: OrderStatus | string): BadgeTone {
  switch (status) {
    case "PAID":
      return "primary";
    case "SHIPPED":
      return "warning";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
    case "REFUNDED":
      return "destructive";
    default:
      return "default";
  }
}

/** Кои статуси още подлежат на обработка от собственика. */
export const OPEN_STATUSES: OrderStatus[] = ["PENDING", "PAID", "SHIPPED"];

/** Статуси, при които поръчката се смята за приход. */
export const REVENUE_STATUSES: OrderStatus[] = ["PAID", "SHIPPED", "COMPLETED"];
