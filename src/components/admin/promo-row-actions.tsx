"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { togglePromoCode, deletePromoCode } from "@/app/actions/admin-content";
import { TrashIcon } from "../icons";
import { useToast } from "../toast";
import { Button } from "../ui";

export function PromoRowActions({
  promoId,
  isActive,
  hasOrders,
}: {
  promoId: string;
  isActive: boolean;
  hasOrders: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">
          {hasOrders ? "Ще бъде изключен?" : "Изтриване?"}
        </span>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deletePromoCode(promoId);
              toast(res.message, res.ok ? "success" : "error");
              setConfirming(false);
              router.refresh();
            })
          }
        >
          Да
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Не
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await togglePromoCode(promoId);
            toast(res.message, res.ok ? "success" : "error");
            router.refresh();
          })
        }
        className="h-8 px-2.5 inline-flex items-center rounded-md border border-border font-sans text-xs font-bold hover:border-primary hover:text-primary transition-colors"
      >
        {isActive ? "Изключи" : "Активирай"}
      </button>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Изтрий"
        title={hasOrders ? "Изключи (използван е в поръчки)" : "Изтрий"}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
      >
        <TrashIcon size={15} />
      </button>
    </div>
  );
}
