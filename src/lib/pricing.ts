import type { DiscountType, ProductType } from "@prisma/client";
import { env } from "./env";

export type PricedLine = {
  productId?: string;
  bundleId?: string;
  title: string;
  type: ProductType;
  unitCents: number;
  quantity: number;
};

export type PromoLike = {
  id: string;
  code: string;
  discountType: DiscountType;
  amount: number;
  minOrderCents: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
};

export type PromoValidation =
  | { ok: true; discountCents: number; promo: PromoLike }
  | { ok: false; reason: string };

/**
 * Проверява промо код срещу текущата кошница.
 * Причината за отказ се връща на български, готова за показване.
 */
export function validatePromo(
  promo: PromoLike | null,
  subtotalCents: number,
  now = new Date(),
): PromoValidation {
  if (!promo) return { ok: false, reason: "Невалиден промо код." };
  if (!promo.isActive) return { ok: false, reason: "Този промо код вече не е активен." };
  if (promo.startsAt && promo.startsAt > now)
    return { ok: false, reason: "Този промо код все още не е валиден." };
  if (promo.expiresAt && promo.expiresAt < now)
    return { ok: false, reason: "Срокът на този промо код е изтекъл." };
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses)
    return { ok: false, reason: "Този промо код е достигнал максималния брой употреби." };
  if (promo.minOrderCents && subtotalCents < promo.minOrderCents) {
    const min = (promo.minOrderCents / 100).toFixed(2);
    return { ok: false, reason: `Кодът важи за поръчки над ${min} ${env.shop.currencyLabel}` };
  }

  const raw =
    promo.discountType === "PERCENT"
      ? Math.round((subtotalCents * promo.amount) / 100)
      : promo.amount;

  // Отстъпката никога не надвишава сумата на кошницата.
  const discountCents = Math.max(0, Math.min(raw, subtotalCents));

  return { ok: true, discountCents, promo };
}

export type CartTotals = {
  subtotalCents: number;
  discountCents: number;
  giftCardCents: number;
  shippingCents: number;
  totalCents: number;
  requiresShipping: boolean;
  hasDigital: boolean;
  freeShippingRemainingCents: number | null;
};

/**
 * Изчислява всички суми по кошницата.
 *
 * Правила:
 *  - Доставка се начислява само ако има поне един физически артикул.
 *  - Безплатна доставка над зададен праг (по междинната сума след отстъпка).
 *  - Наложеният платеж може да добавя такса.
 *  - Подаръчната карта се прилага последна, върху крайната сума с доставката.
 */
export function computeTotals(
  lines: PricedLine[],
  opts: {
    discountCents?: number;
    giftCardBalanceCents?: number;
    paymentMethod?: "CARD" | "COD";
  } = {},
): CartTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.quantity, 0);

  const requiresShipping = lines.some((l) => l.type === "PHYSICAL");
  const hasDigital = lines.some((l) => l.type === "PDF" || l.type === "AUDIO");

  const discountCents = Math.max(0, Math.min(opts.discountCents ?? 0, subtotalCents));
  const afterDiscount = subtotalCents - discountCents;

  let shippingCents = 0;
  if (requiresShipping) {
    const threshold = env.shop.freeShippingOverCents;
    const qualifiesFree = threshold > 0 && afterDiscount >= threshold;
    shippingCents = qualifiesFree ? 0 : env.shop.shippingCents;
    if (opts.paymentMethod === "COD") shippingCents += env.shop.codFeeCents;
  }

  const beforeGiftCard = afterDiscount + shippingCents;
  const giftCardCents = Math.max(
    0,
    Math.min(opts.giftCardBalanceCents ?? 0, beforeGiftCard),
  );

  const freeShippingRemainingCents =
    requiresShipping && env.shop.freeShippingOverCents > 0 && shippingCents > 0
      ? env.shop.freeShippingOverCents - afterDiscount
      : null;

  return {
    subtotalCents,
    discountCents,
    giftCardCents,
    shippingCents,
    totalCents: Math.max(0, beforeGiftCard - giftCardCents),
    requiresShipping,
    hasDigital,
    freeShippingRemainingCents:
      freeShippingRemainingCents && freeShippingRemainingCents > 0
        ? freeShippingRemainingCents
        : null,
  };
}

/** Генерира номер на поръчка от вида RMB-2026-000123. */
export function formatOrderNumber(sequence: number, year = new Date().getFullYear()): string {
  return `RMB-${year}-${String(sequence).padStart(6, "0")}`;
}

/** Генерира четим код за подаръчна карта: RMB-XXXX-XXXX. */
export function generateGiftCardCode(): string {
  // Изключени са лесно бърканите символи (0/O, 1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = (n: number) =>
    Array.from(
      { length: n },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  return `RMB-${block(4)}-${block(4)}`;
}
