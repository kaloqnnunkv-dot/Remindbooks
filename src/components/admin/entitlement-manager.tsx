"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProductType } from "@prisma/client";
import { grantEntitlement, revokeEntitlement } from "@/app/actions/admin-orders";
import { formatDate, BG_PRODUCT_TYPE } from "@/lib/format";
import { Badge, Button, Card, Select } from "../ui";
import { TrashIcon } from "../icons";
import { useToast } from "../toast";

type Owned = {
  productId: string;
  title: string;
  type: ProductType;
  grantedManually: boolean;
  grantedAt: string;
  downloadCount: number;
};

/**
 * Ръчно отключване на PDF/аудио за конкретен потребител.
 * Полезно при проблем с плащане, подарък или замяна на дефектен файл.
 */
export function EntitlementManager({
  userId,
  products,
  owned,
  availableIds,
}: {
  userId: string;
  products: { id: string; title: string; type: ProductType }[];
  owned: Owned[];
  availableIds: string[];
}) {
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const available = products.filter((p) => availableIds.includes(p.id));

  function grant() {
    if (!selected) return;
    startTransition(async () => {
      const res = await grantEntitlement(userId, selected);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) setSelected("");
      router.refresh();
    });
  }

  function revoke(productId: string) {
    startTransition(async () => {
      const res = await revokeEntitlement(userId, productId);
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {owned.length > 0 ? (
        <Card className="divide-y divide-border">
          {owned.map((item) => (
            <div
              key={item.productId}
              className="p-4 flex flex-wrap items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-sans text-sm font-bold">{item.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Badge tone="outline">{BG_PRODUCT_TYPE[item.type]}</Badge>
                  {item.grantedManually && <Badge tone="warning">Ръчно отключена</Badge>}
                  <span className="text-xs text-muted-foreground">
                    от {formatDate(item.grantedAt)}
                    {item.downloadCount > 0 && ` · ${item.downloadCount} сваляния`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => revoke(item.productId)}
                disabled={pending}
                aria-label={`Премахни достъпа до ${item.title}`}
                className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors"
              >
                <TrashIcon size={15} />
              </button>
            </div>
          ))}
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">
          Този потребител още няма отключено дигитално съдържание.
        </p>
      )}

      {available.length > 0 && (
        <Card className="p-4">
          <label
            htmlFor="grant-product"
            className="block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2"
          >
            Отключи допълнително съдържание
          </label>
          <div className="flex flex-wrap gap-2">
            <Select
              id="grant-product"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex-1 min-w-52"
            >
              <option value="">— изберете продукт —</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({BG_PRODUCT_TYPE[p.type]})
                </option>
              ))}
            </Select>
            <Button type="button" onClick={grant} disabled={pending || !selected}>
              {pending ? "…" : "Отключи"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
