"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteBundle, toggleBundlePublished } from "@/app/actions/admin-products";
import { EditIcon, TrashIcon } from "../icons";
import { useToast } from "../toast";
import { Button } from "../ui";

export function BundleRowActions({
  bundleId,
  isPublished,
  hasOrders,
}: {
  bundleId: string;
  isPublished: boolean;
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
          {hasOrders ? "Ще бъде скрит?" : "Изтриване?"}
        </span>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteBundle(bundleId);
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
            const res = await toggleBundlePublished(bundleId);
            toast(res.message, res.ok ? "success" : "error");
            router.refresh();
          })
        }
        className="h-8 px-2.5 inline-flex items-center rounded-md border border-border font-sans text-xs font-bold hover:border-primary hover:text-primary transition-colors"
      >
        {isPublished ? "Скрий" : "Публикувай"}
      </button>

      <Link
        href={`/admin/komplekti/${bundleId}`}
        title="Редактирай"
        aria-label="Редактирай"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:border-primary hover:text-primary transition-colors"
      >
        <EditIcon size={15} />
      </Link>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Изтрий"
        title={hasOrders ? "Скрий (има поръчки)" : "Изтрий"}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
      >
        <TrashIcon size={15} />
      </button>
    </div>
  );
}
