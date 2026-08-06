"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveComment, deleteComment } from "@/app/actions/admin-orders";
import { CheckIcon, CloseIcon, TrashIcon } from "../icons";
import { useToast } from "../toast";
import { Button } from "../ui";

export function CommentActions({
  commentId,
  isApproved,
}: {
  commentId: string;
  isApproved: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  if (confirming) {
    return (
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">Изтриване?</span>
        <Button
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteComment(commentId);
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
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await approveComment(commentId, !isApproved);
            toast(res.message, res.ok ? "success" : "error");
            router.refresh();
          })
        }
        className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-border font-sans text-xs font-bold hover:border-primary hover:text-primary transition-colors"
      >
        {isApproved ? <CloseIcon size={14} /> : <CheckIcon size={14} />}
        {isApproved ? "Скрий" : "Одобри"}
      </button>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Изтрий коментара"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
      >
        <TrashIcon size={15} />
      </button>
    </div>
  );
}
