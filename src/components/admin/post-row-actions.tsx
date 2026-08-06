"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePost, togglePostPublished } from "@/app/actions/admin-content";
import { EditIcon, TrashIcon } from "../icons";
import { useToast } from "../toast";
import { Button } from "../ui";

export function PostRowActions({
  postId,
  slug,
  isPublished,
}: {
  postId: string;
  slug: string;
  isPublished: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Изтриване?</span>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deletePost(postId);
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

  const iconButton =
    "h-8 w-8 inline-flex items-center justify-center rounded-md border border-border hover:border-primary hover:text-primary transition-colors";

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await togglePostPublished(postId);
            toast(res.message, res.ok ? "success" : "error");
            router.refresh();
          })
        }
        className="h-8 px-2.5 inline-flex items-center rounded-md border border-border font-sans text-xs font-bold hover:border-primary hover:text-primary transition-colors"
      >
        {isPublished ? "Скрий" : "Публикувай"}
      </button>

      {isPublished && (
        <Link
          href={`/blog/${slug}`}
          target="_blank"
          title="Виж в сайта"
          aria-label="Виж в сайта"
          className={iconButton}
        >
          ↗
        </Link>
      )}

      <Link
        href={`/admin/blog/${postId}`}
        title="Редактирай"
        aria-label="Редактирай"
        className={iconButton}
      >
        <EditIcon size={15} />
      </Link>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        title="Изтрий"
        aria-label="Изтрий"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
      >
        <TrashIcon size={15} />
      </button>
    </div>
  );
}
