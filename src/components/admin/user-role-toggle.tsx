"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleUserRole } from "@/app/actions/admin-content";
import { Badge, Button } from "../ui";
import { useToast } from "../toast";

export function UserRoleToggle({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: string;
  isSelf: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const isAdmin = role === "ADMIN";

  return (
    <div className="space-y-3">
      <div>
        {isAdmin ? (
          <Badge tone="primary">Администратор</Badge>
        ) : (
          <Badge tone="default">Потребител</Badge>
        )}
      </div>

      {isSelf ? (
        <p className="text-xs text-muted-foreground">
          Това е вашият профил. Не можете да променяте собствената си роля.
        </p>
      ) : confirming ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {isAdmin
              ? "Потребителят ще загуби достъп до административния панел."
              : "Потребителят ще получи пълен достъп до административния панел, включително всички поръчки и файлове."}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isAdmin ? "destructive" : "primary"}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await toggleUserRole(userId);
                  toast(res.message, res.ok ? "success" : "error");
                  setConfirming(false);
                  router.refresh();
                })
              }
            >
              Потвърди
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              Отказ
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirming(true)}
          className="w-full"
        >
          {isAdmin ? "Отнеми администраторски права" : "Направи администратор"}
        </Button>
      )}
    </div>
  );
}
