"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProductType } from "@prisma/client";

import { deleteProduct, toggleProductFlag } from "@/app/actions/admin-products";
import { productHref } from "../product-card";
import { EditIcon, TrashIcon } from "../icons";
import { useToast } from "../toast";
import { Button } from "../ui";

export function ProductRowActions({
  productId,
  slug,
  type,
  isPublished,
  hasOrders,
}: {
  productId: string;
  slug: string;
  type: ProductType;
  isPublished: boolean;
  hasOrders: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function onDelete() {
    startTransition(async () => {
      const res = await deleteProduct(productId);
      toast(res.message, res.ok ? "success" : "error");
      setConfirming(false);
      router.refresh();
    });
  }

  function onTogglePublish() {
    startTransition(async () => {
      const res = await toggleProductFlag(productId, "isPublished");
      toast(res.ok ? (isPublished ? "Скрит от сайта." : "Публикуван.") : res.message,
        res.ok ? "success" : "error");
      router.refresh();
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">
          {hasOrders ? "Ще бъде скрит?" : "Изтриване?"}
        </span>
        <Button
          size="sm"
          variant="destructive"
          onClick={onDelete}
          disabled={pending}
        >
          Да
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Не
        </Button>
      </div>
    );
  }

  const iconButton =
    "h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:border-primary hover:text-primary transition-colors";

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onTogglePublish}
        disabled={pending}
        title={isPublished ? "Скрий от сайта" : "Публикувай"}
        aria-label={isPublished ? "Скрий от сайта" : "Публикувай"}
        className="h-8 px-2.5 inline-flex items-center rounded-md border border-border font-sans text-xs font-bold hover:border-primary hover:text-primary transition-colors"
      >
        {isPublished ? "Скрий" : "Публикувай"}
      </button>

      <Link
        href={productHref({ type, slug })}
        target="_blank"
        title="Виж в сайта"
        aria-label="Виж в сайта"
        className={iconButton}
      >
        ↗
      </Link>

      <Link
        href={`/admin/produkti/${productId}`}
        title="Редактирай"
        aria-label="Редактирай"
        className={iconButton}
      >
        <EditIcon size={15} />
      </Link>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        title={hasOrders ? "Скрий (има поръчки)" : "Изтрий"}
        aria-label="Изтрий"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
      >
        <TrashIcon size={15} />
      </button>
    </div>
  );
}
