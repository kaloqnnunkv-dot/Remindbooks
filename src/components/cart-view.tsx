"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ProductType } from "@prisma/client";

import { updateCartQuantity, removeFromCart } from "@/app/actions/cart";
import { formatPrice } from "@/lib/format";
import { productHref } from "./product-card";
import { QuantityPicker } from "./add-to-cart";
import { Badge, ButtonLink, Card, cn } from "./ui";
import { TrashIcon } from "./icons";
import { ProductTypeBadge } from "./product-type-badge";
import { useToast } from "./toast";

export type CartLine = {
  id: string;
  kind: "p" | "b";
  slug: string;
  title: string;
  type: ProductType;
  unitCents: number;
  quantity: number;
  maxQuantity: number;
  isDigital: boolean;
  coverImage: string | null;
  unavailable?: string;
};

type Totals = {
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  requiresShipping: boolean;
  hasDigital: boolean;
  freeShippingRemainingCents: number | null;
};

export function CartView({
  lines,
  totals,
  freeShippingThresholdCents,
  canCheckout,
}: {
  lines: CartLine[];
  totals: Totals;
  freeShippingThresholdCents: number;
  canCheckout: boolean;
}) {
  return (
    <div className="grid lg:grid-cols-3 gap-10">
      <div className="lg:col-span-2 space-y-4">
        {lines.map((line) => (
          <CartRow key={`${line.kind}-${line.id}`} line={line} />
        ))}

        <div className="pt-4">
          <ButtonLink href="/knigi" variant="ghost">
            ← Продължи с пазаруването
          </ButtonLink>
        </div>
      </div>

      {/* Обобщение */}
      <aside className="lg:col-span-1">
        <Card className="p-6 lg:sticky lg:top-24">
          <h2 className="font-sans text-lg font-bold mb-5">Обобщение</h2>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Междинна сума</dt>
              <dd>{formatPrice(totals.subtotalCents)}</dd>
            </div>

            {totals.requiresShipping && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Доставка</dt>
                <dd>
                  {totals.shippingCents === 0 ? (
                    <span className="text-success font-bold">Безплатна</span>
                  ) : (
                    formatPrice(totals.shippingCents)
                  )}
                </dd>
              </div>
            )}

            {totals.hasDigital && !totals.requiresShipping && (
              <p className="text-xs text-muted-foreground">
                Дигитално съдържание — не се начислява доставка.
              </p>
            )}

            <div className="pt-3 mt-3 border-t border-border flex justify-between gap-4 font-sans font-bold text-lg">
              <dt>Общо</dt>
              <dd>{formatPrice(totals.totalCents)}</dd>
            </div>
          </dl>

          {/* Подсказка за безплатна доставка */}
          {totals.freeShippingRemainingCents !== null && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-xs">
                Добавете още{" "}
                <span className="font-bold">
                  {formatPrice(totals.freeShippingRemainingCents)}
                </span>{" "}
                за безплатна доставка.
              </p>
              <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (totals.subtotalCents / freeShippingThresholdCents) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          <ButtonLink
            href="/checkout"
            size="lg"
            className={cn("w-full mt-6", !canCheckout && "pointer-events-none opacity-50")}
            aria-disabled={!canCheckout}
          >
            Към плащане
          </ButtonLink>

          <p className="mt-4 text-xs text-muted-foreground text-center leading-relaxed">
            Плащането се обработва сигурно от Stripe. Не съхраняваме данни на
            вашата карта.
          </p>
        </Card>
      </aside>
    </div>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function setQuantity(next: number) {
    startTransition(async () => {
      const res = await updateCartQuantity(line.id, line.kind, next);
      if (!res.ok) toast(res.message, "error");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await removeFromCart(line.id, line.kind);
      toast(res.message, res.ok ? "success" : "error");
      router.refresh();
    });
  }

  const href =
    line.kind === "p"
      ? productHref({ type: line.type, slug: line.slug })
      : `/knigi`;

  return (
    <Card
      className={cn(
        "p-4 flex gap-4 transition-opacity",
        pending && "opacity-60",
        line.unavailable && "border-destructive/50",
      )}
    >
      <Link
        href={href}
        className="relative w-20 h-28 shrink-0 bg-muted rounded-sm overflow-hidden border border-border"
      >
        {line.coverImage && (
          <Image
            src={line.coverImage}
            alt={line.title}
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              href={href}
              className="font-sans text-sm font-bold hover:text-primary transition-colors line-clamp-2"
            >
              {line.title}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {line.kind === "b" ? (
                <Badge tone="outline">Комплект</Badge>
              ) : (
                <ProductTypeBadge type={line.type} variant="inline" short />
              )}
              {line.unavailable && (
                <Badge tone="destructive">{line.unavailable}</Badge>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label={`Премахни „${line.title}“ от кошницата`}
            className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
          >
            <TrashIcon size={16} />
          </button>
        </div>

        <div className="mt-auto pt-3 flex flex-wrap items-center justify-between gap-3">
          {line.isDigital ? (
            <span className="text-xs text-muted-foreground">
              Дигитален продукт — 1 бр.
            </span>
          ) : (
            <QuantityPicker
              value={line.quantity}
              onChange={setQuantity}
              max={line.maxQuantity}
              disabled={pending || Boolean(line.unavailable)}
            />
          )}

          <div className="text-right">
            {line.quantity > 1 && (
              <div className="text-xs text-muted-foreground">
                {formatPrice(line.unitCents)} × {line.quantity}
              </div>
            )}
            <div className="font-sans font-bold">
              {formatPrice(line.unitCents * line.quantity)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
