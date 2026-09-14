"use client";

import type { ReactNode } from "react";
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
  footer,
}: {
  lines: SummaryLine[];
  subtotalCents: number;
  discountCents?: number;
  giftCardCents?: number;
  shippingCents?: number;
  totalCents: number;
  showShipping?: boolean;
  /** Бутонът за плащане и бележката под него — част от същата кутия. */
  footer?: ReactNode;
}) {
  /*
    Кутията се побира в екрана цялата, заедно с бутона.

    Бутонът стои вътре, под общата сума, защото там му е мястото: човек гледа
    сумата и натиска. Отделен от кутията изглеждаше като чужда лента.

    За да не изтласка бутона надолу дълга поръчка, височината на кутията е
    ограничена до екрана, а списъкът с книгите се свива и се превърта сам.
    Сумата и бутонът не се свиват — те трябва да се виждат винаги.
  */
  return (
    <Card className="flex flex-col p-6 lg:max-h-[calc(100vh-7rem)]">
      <h2 className="shrink-0 font-sans text-lg font-bold mb-5">Вашата поръчка</h2>

      <ul className="space-y-3 mb-5 max-h-72 overflow-y-auto lg:min-h-0 lg:flex-1">
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

      <dl className="shrink-0 space-y-2 text-sm pt-4 border-t border-border">
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

      {footer && <div className="shrink-0 pt-5">{footer}</div>}
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
