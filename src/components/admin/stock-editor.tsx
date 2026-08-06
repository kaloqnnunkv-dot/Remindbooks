"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateStock, updateLowStockAlert } from "@/app/actions/admin-products";
import { useToast } from "../toast";
import { cn } from "../ui";

/**
 * Редактиране на количеството направо в таблицата.
 * Записва при загуба на фокус или Enter — без отделен бутон „Запази“.
 */
export function StockEditor({
  productId,
  initial,
  field,
}: {
  productId: string;
  initial: number;
  field: "stock" | "lowStockAlert";
}) {
  const [value, setValue] = useState(String(initial));
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function save() {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 0) {
      setValue(String(initial));
      toast("Въведете цяло положително число.", "error");
      return;
    }
    if (parsed === initial) return;

    startTransition(async () => {
      const res =
        field === "stock"
          ? await updateStock(productId, parsed)
          : await updateLowStockAlert(productId, parsed);

      if (!res.ok) {
        setValue(String(initial));
        toast(res.message, "error");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
      router.refresh();
    });
  }

  return (
    <input
      type="number"
      min={0}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setValue(String(initial));
          e.currentTarget.blur();
        }
      }}
      disabled={pending}
      aria-label={field === "stock" ? "Количество" : "Праг за известие"}
      className={cn(
        "w-20 h-9 text-center rounded-md border bg-card font-mono text-sm tabular-nums transition-colors",
        "focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25",
        saved ? "border-success" : "border-input",
        pending && "opacity-60",
      )}
    />
  );
}
