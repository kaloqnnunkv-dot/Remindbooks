"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteOrder } from "@/app/actions/admin-orders";
import { TrashIcon } from "../icons";
import { useToast } from "../toast";
import { Button } from "../ui";

/**
 * Изтриване на поръчка от списъка.
 *
 * Потвърждението не е формалност: платената поръчка е част от счетоводството и
 * изтриването ѝ връща наличности и достъпи. Затова предупреждението казва
 * различни неща за платена и за чакаща поръчка.
 */
export function OrderRowActions({
  orderId,
  orderNumber,
  isPaid,
}: {
  orderId: string;
  orderNumber: string;
  isPaid: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function onDelete() {
    startTransition(async () => {
      const res = await deleteOrder(orderId);
      toast(res.message, res.ok ? "success" : "error");
      setConfirming(false);
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex flex-col items-end gap-1.5">
        <span className="text-xs text-muted-foreground text-right">
          {isPaid
            ? "Платена поръчка. Наличностите и достъпите се връщат, но пари в Stripe НЕ се възстановяват. Изтриване?"
            : "Изтриване без връщане назад?"}
        </span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="destructive" onClick={onDelete} disabled={pending}>
            {pending ? "Трие се…" : "Да, изтрий"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Откажи
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end">
      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={`Изтрий ${orderNumber}`}
        aria-label={`Изтрий поръчка ${orderNumber}`}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
      >
        <TrashIcon size={15} />
      </button>
    </div>
  );
}
