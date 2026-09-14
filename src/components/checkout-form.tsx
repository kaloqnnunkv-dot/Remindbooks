"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { submitCheckout, type CheckoutState } from "@/app/actions/checkout";
import { formatPrice } from "@/lib/format";
import { OrderSummary, type SummaryLine } from "./order-summary";
import { PromoField, GiftCardField } from "./promo-field";
import { Alert, Button, Card, Checkbox, Field, Input, Textarea, cn } from "./ui";

const initialState: CheckoutState = { ok: false, message: "" };

type Defaults = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
};

export function CheckoutForm({
  lines,
  totals,
  defaults,
  codEnabled,
  cardEnabled,
  giftCardsEnabled,
  shippingCents,
  shippingOfficeCents,
  codFeeCents,
  freeShippingOverCents,
}: {
  lines: SummaryLine[];
  totals: { subtotalCents: number; shippingCents: number; totalCents: number };
  defaults: Defaults;
  codEnabled: boolean;
  cardEnabled: boolean;
  giftCardsEnabled: boolean;
  /** Тарифата за доставка до адрес. */
  shippingCents: number;
  /** Тарифата за доставка до офис на куриера. */
  shippingOfficeCents: number;
  codFeeCents: number;
  freeShippingOverCents: number;
}) {
  const [state, action, pending] = useActionState(submitCheckout, initialState);

  const [paymentMethod, setPaymentMethod] = useState<"CARD" | "COD">(
    cardEnabled ? "CARD" : "COD",
  );
  // До офис е по-евтино, затова стои първо и е избрано по подразбиране.
  const [deliveryMethod, setDeliveryMethod] = useState<"ADDRESS" | "OFFICE">("OFFICE");
  const [discountCents, setDiscountCents] = useState(0);
  const [giftCardBalance, setGiftCardBalance] = useState(0);

  // Сумите се преизчисляват в реално време по същите правила като на сървъра.
  const afterDiscount = Math.max(0, totals.subtotalCents - discountCents);
  const qualifiesFreeShipping =
    freeShippingOverCents > 0 && afterDiscount >= freeShippingOverCents;
  const deliveryRate =
    deliveryMethod === "OFFICE" ? shippingOfficeCents : shippingCents;
  const liveShipping =
    (qualifiesFreeShipping ? 0 : deliveryRate) +
    (paymentMethod === "COD" ? codFeeCents : 0);
  const beforeGiftCard = afterDiscount + liveShipping;
  const appliedGiftCard = Math.min(giftCardBalance, beforeGiftCard);
  const liveTotal = Math.max(0, beforeGiftCard - appliedGiftCard);

  return (
    <form action={action} className="grid lg:grid-cols-3 gap-10" noValidate>
      <div className="lg:col-span-2 space-y-6">
        {/* Данни за доставка */}
        <Card className="p-6">
          <h2 className="font-sans text-lg font-bold mb-5">Данни за доставка</h2>

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Име" htmlFor="c-first" required error={state.errors?.firstName}>
                <Input
                  id="c-first"
                  name="firstName"
                  defaultValue={defaults.firstName}
                  required
                  autoComplete="given-name"
                />
              </Field>

              <Field
                label="Фамилия"
                htmlFor="c-last"
                required
                error={state.errors?.lastName}
              >
                <Input
                  id="c-last"
                  name="lastName"
                  defaultValue={defaults.lastName}
                  required
                  autoComplete="family-name"
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Имейл" htmlFor="c-email" required error={state.errors?.email}>
                <Input
                  id="c-email"
                  name="email"
                  type="email"
                  defaultValue={defaults.email}
                  required
                  autoComplete="email"
                />
              </Field>

              <Field
                label="Телефон"
                htmlFor="c-phone"
                required
                hint="За връзка с куриера."
                error={state.errors?.phone}
              >
                <Input
                  id="c-phone"
                  name="phone"
                  type="tel"
                  defaultValue={defaults.phone}
                  required
                  placeholder="0888 123 456"
                  autoComplete="tel"
                />
              </Field>
            </div>

            {/* Изборът стои преди адреса, защото сменя и цената, и това, което
                се очаква да бъде написано в полето под него. */}
            <fieldset>
              <legend className="mb-2 block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Начин на доставка
              </legend>
              <input type="hidden" name="deliveryMethod" value={deliveryMethod} />
              <div className="grid gap-3 sm:grid-cols-2">
                <DeliveryOption
                  checked={deliveryMethod === "OFFICE"}
                  onChange={() => setDeliveryMethod("OFFICE")}
                  title="До офис на куриера"
                  price={shippingOfficeCents}
                  free={qualifiesFreeShipping}
                />
                <DeliveryOption
                  checked={deliveryMethod === "ADDRESS"}
                  onChange={() => setDeliveryMethod("ADDRESS")}
                  title="До адрес"
                  price={shippingCents}
                  free={qualifiesFreeShipping}
                />
              </div>
            </fieldset>

            <Field
              label={deliveryMethod === "OFFICE" ? "Офис на куриера" : "Адрес за доставка"}
              htmlFor="c-address"
              required
              hint={
                deliveryMethod === "OFFICE"
                  ? "Град и офис — например „Спиди, офис Дружба 2“."
                  : "Улица, номер, вход, апартамент."
              }
              error={state.errors?.addressLine}
            >
              <Input
                id="c-address"
                name="addressLine"
                defaultValue={defaults.addressLine}
                required
                placeholder={
                  deliveryMethod === "OFFICE"
                    ? "Спиди, офис …"
                    : "ул. …, №…, вх. …, ап. …"
                }
                autoComplete="street-address"
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Град" htmlFor="c-city" required error={state.errors?.city}>
                <Input
                  id="c-city"
                  name="city"
                  defaultValue={defaults.city}
                  required
                  autoComplete="address-level2"
                />
              </Field>

              <Field
                label="Пощенски код"
                htmlFor="c-postal"
                required
                error={state.errors?.postalCode}
              >
                <Input
                  id="c-postal"
                  name="postalCode"
                  defaultValue={defaults.postalCode}
                  required
                  autoComplete="postal-code"
                />
              </Field>
            </div>

            <Field label="Бележка към поръчката" htmlFor="c-notes">
              <Textarea
                id="c-notes"
                name="notes"
                maxLength={1000}
                rows={3}
                placeholder="Например: оставете при съседа, звъннете преди доставка…"
              />
            </Field>
          </div>
        </Card>

        {/* Начин на плащане */}
        <Card className="p-6">
          <h2 className="font-sans text-lg font-bold mb-5">Начин на плащане</h2>

          <div className="space-y-3">
            {cardEnabled && (
              <PaymentOption
                value="CARD"
                checked={paymentMethod === "CARD"}
                onChange={() => setPaymentMethod("CARD")}
                title="Плащане с карта"
                description="Сигурно плащане чрез Stripe. Приемат се Visa, Mastercard и Maestro."
              />
            )}

            {codEnabled && (
              <PaymentOption
                value="COD"
                checked={paymentMethod === "COD"}
                onChange={() => setPaymentMethod("COD")}
                title="Наложен платеж"
                description={
                  codFeeCents > 0
                    ? `Плащате в брой на куриера. Такса ${formatPrice(codFeeCents)}.`
                    : "Плащате в брой при получаване от куриера."
                }
              />
            )}
          </div>

          <input type="hidden" name="paymentMethod" value={paymentMethod} />
        </Card>

        {/* Отстъпки */}
        <Card className="p-6 space-y-5">
          <h2 className="font-sans text-lg font-bold">Отстъпки</h2>
          <PromoField
            onApplied={(_, discount) => setDiscountCents(discount)}
          />
          {giftCardsEnabled && (
            <GiftCardField
              onApplied={(_, balance) => setGiftCardBalance(balance)}
            />
          )}
        </Card>

        {/* Съгласие */}
        <Card className="p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox name="acceptTerms" required className="mt-0.5" />
            <span className="text-sm leading-snug">
              Приемам{" "}
              <Link
                href="/obshti-uslovia"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                Общите условия
              </Link>{" "}
              и{" "}
              <Link
                href="/poveritelnost"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                Политиката за поверителност
              </Link>
              .
            </span>
          </label>
          {state.errors?.acceptTerms && (
            <p className="mt-2 text-xs text-destructive">{state.errors.acceptTerms}</p>
          )}
        </Card>

        {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}
      </div>

      {/* Обобщение */}
      {/*
        Кутията следва погледа и се побира цяла в екрана — бутонът е вътре в
        нея, под общата сума, и затова не може да изостане надолу.
      */}
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-24">
          <OrderSummary
            lines={lines}
            subtotalCents={totals.subtotalCents}
            discountCents={discountCents}
            giftCardCents={appliedGiftCard}
            shippingCents={liveShipping}
            totalCents={liveTotal}
            footer={
              <>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={pending || (!cardEnabled && !codEnabled)}
                >
                  {pending
                    ? "Обработване…"
                    : paymentMethod === "CARD"
                      ? `Плати ${formatPrice(liveTotal)}`
                      : "Завърши поръчката"}
                </Button>

                <p className="mt-3 text-xs text-muted-foreground text-center leading-relaxed">
                  {paymentMethod === "CARD"
                    ? "Ще бъдете пренасочени към защитената страница на Stripe."
                    : "Ще платите в брой на куриера при получаване."}
                </p>
              </>
            }
          />
        </div>
      </aside>
    </form>
  );
}

/**
 * Един от двата начина на доставка.
 *
 * Цената стои в самия избор, защото разликата между офис и адрес е точно тя —
 * ако не се вижда тук, клиентът я открива чак в сметката отдясно.
 */
function DeliveryOption({
  checked,
  onChange,
  title,
  price,
  free,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  price: number;
  free: boolean;
}) {
  return (
    <label
      className={cn(
        "flex items-center justify-between gap-3 p-4 border rounded-md cursor-pointer transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
      )}
    >
      <span className="flex items-center gap-3">
        <input
          type="radio"
          name="deliveryChoice"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 accent-[var(--primary)]"
        />
        <span className="font-sans text-sm font-bold">{title}</span>
      </span>
      <span className="font-sans text-sm font-bold whitespace-nowrap">
        {free ? "безплатно" : formatPrice(price)}
      </span>
    </label>
  );
}

function PaymentOption({
  value,
  checked,
  onChange,
  title,
  description,
}: {
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3 p-4 border rounded-md cursor-pointer transition-colors",
        checked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
      )}
    >
      <input
        type="radio"
        name="paymentMethodChoice"
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-[var(--primary)]"
      />
      <span>
        <span className="block font-sans text-sm font-bold">{title}</span>
        <span className="block text-sm text-muted-foreground mt-0.5">
          {description}
        </span>
      </span>
    </label>
  );
}
