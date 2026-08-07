"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { Card } from "./ui";

export type SummaryLine = {
  title: string;
  quantity: number;
  unitCents: number;
  coverImage: string | null;
  isDigital: boolean;
};

/**
 * Обобщение на поръчката в checkout — показва артикулите и живите суми,
 * които се преизчисляват при прилагане на промо код или смяна на плащането.
 */
export function OrderSummary({
  lines,
  subtotalCents,
  discountCents = 0,
  giftCardCents = 0,
  shippingCents,
  totalCents,
  showShipping = true,
}: {
  lines: SummaryLine[];
  subtotalCents: number;
  discountCents?: number;
  giftCardCents?: number;
  shippingCents?: number;
  totalCents: number;
  showShipping?: boolean;
}) {
  return (
    <Card className="p-6 lg:sticky lg:top-24">
      <h2 className="font-sans text-lg font-bold mb-5">Вашата поръчка</h2>

      <ul className="space-y-3 mb-5 max-h-72 overflow-y-auto">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-3">
            <div className="relative w-12 h-[4.5rem] shrink-0 bg-card rounded-sm overflow-hidden border border-border">
              {line.coverImage && (
                <Image
                  src={line.coverImage}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              )}
              {line.quantity > 1 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-sans font-bold">
                  {line.quantity}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-sans font-bold leading-snug line-clamp-2">
                {line.title}
              </p>
              {line.isDigital && (
                <p className="text-xs text-muted-foreground mt-0.5">Дигитален</p>
              )}
            </div>

            <span className="text-sm font-sans font-bold whitespace-nowrap">
              {formatPrice(line.unitCents * line.quantity)}
            </span>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 text-sm pt-4 border-t border-border">
        <Row label="Междинна сума" value={formatPrice(subtotalCents)} />

        {discountCents > 0 && (
          <Row
            label="Промо отстъпка"
            value={`− ${formatPrice(discountCents)}`}
            tone="success"
          />
        )}

        {giftCardCents > 0 && (
          <Row
            label="Подаръчна карта"
            value={`− ${formatPrice(giftCardCents)}`}
            tone="success"
          />
        )}

        {showShipping && shippingCents !== undefined && (
          <Row
            label="Доставка"
            value={shippingCents === 0 ? "Безплатна" : formatPrice(shippingCents)}
            tone={shippingCents === 0 ? "success" : undefined}
          />
        )}

        <div className="pt-3 mt-3 border-t border-border flex justify-between gap-4 font-sans font-bold text-lg">
          <dt>Общо</dt>
          <dd>{formatPrice(totalCents)}</dd>
        </div>
      </dl>
    </Card>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={tone === "success" ? "text-success font-bold" : ""}>{value}</dd>
    </div>
  );
}
