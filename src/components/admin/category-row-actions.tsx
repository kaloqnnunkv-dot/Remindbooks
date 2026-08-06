"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCategory } from "@/app/actions/admin-products";
import { TrashIcon } from "../icons";
import { useToast } from "../toast";
import { Button } from "../ui";

export function CategoryRowActions({
  categoryId,
  productCount,
}: {
  categoryId: string;
  productCount: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">
          {productCount > 0
            ? `${productCount} продукта ще останат без категория.`
            : "Изтриване?"}
        </span>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteCategory(categoryId);
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
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label="Изтрий категорията"
      className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
    >
      <TrashIcon size={15} />
    </button>
  );
}
