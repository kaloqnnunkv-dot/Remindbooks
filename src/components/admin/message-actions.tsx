"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markMessageRead, deleteMessage } from "@/app/actions/admin-orders";
import { CheckIcon, TrashIcon } from "../icons";
import { useToast } from "../toast";
import { Button } from "../ui";

export function MessageActions({
  messageId,
  isRead,
}: {
  messageId: string;
  isRead: boolean;
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
              const res = await deleteMessage(messageId);
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
            const res = await markMessageRead(messageId, !isRead);
            toast(res.message, res.ok ? "success" : "error");
            router.refresh();
          })
        }
        title={isRead ? "Отбележи като непрочетено" : "Отбележи като прочетено"}
        className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md border border-border font-sans text-xs font-bold hover:border-primary hover:text-primary transition-colors"
      >
        <CheckIcon size={14} />
        {isRead ? "Непрочетено" : "Прочетено"}
      </button>

      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label="Изтрий съобщението"
        className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
      >
        <TrashIcon size={15} />
      </button>
    </div>
  );
}
