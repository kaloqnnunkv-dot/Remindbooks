"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  submitDigitalCheckout,
  type CheckoutState,
} from "@/app/actions/checkout";
import { formatPrice } from "@/lib/format";
import { OrderSummary, type SummaryLine } from "./order-summary";
import { PromoField } from "./promo-field";
import { Alert, Button, Card, Checkbox, Field, Input } from "./ui";
import { CheckIcon, DownloadIcon, MailIcon } from "./icons";

const initialState: CheckoutState = { ok: false, message: "" };

/**
 * Опростен checkout само за дигитално съдържание.
 *
 * Изисква единствено имейл — без адрес, без телефон, без задължителна
 * регистрация, точно както изисква спецификацията.
 */
export function DigitalCheckoutForm({
  lines,
  totals,
  defaultEmail,
  isLoggedIn,
  cardEnabled,
}: {
  lines: SummaryLine[];
  totals: { subtotalCents: number; totalCents: number };
  defaultEmail: string;
  isLoggedIn: boolean;
  cardEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(submitDigitalCheckout, initialState);
  const [discountCents, setDiscountCents] = useState(0);

  const liveTotal = Math.max(0, totals.subtotalCents - discountCents);

  return (
    <form action={action} className="grid lg:grid-cols-3 gap-10" noValidate>
      <div className="lg:col-span-2 space-y-6">
        <Card className="p-6">
          <h2 className="font-sans text-lg font-bold mb-1">Къде да изпратим книгите</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Ще получите линк за сваляне на този адрес веднага след плащането.
          </p>

          <Field label="Имейл" htmlFor="d-email" required error={state.errors?.email}>
            <Input
              id="d-email"
              name="email"
              type="email"
              defaultValue={defaultEmail}
              required
              autoComplete="email"
              autoFocus={!defaultEmail}
              placeholder="вашият@имейл.bg"
            />
          </Field>

          {!isLoggedIn && (
            <p className="mt-4 text-sm text-muted-foreground">
              Купувате като гост.{" "}
              <Link
                href={`/vhod?redirect=${encodeURIComponent("/checkout")}`}
                className="text-primary underline underline-offset-2"
              >
                Влезте
              </Link>{" "}
              или{" "}
              <Link
                href={`/registracia?redirect=${encodeURIComponent("/checkout")}`}
                className="text-primary underline underline-offset-2"
              >
                създайте профил
              </Link>
              , за да имате достъп до книгите завинаги.
            </p>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="font-sans text-lg font-bold mb-5">Промо код</h2>
          <PromoField onApplied={(_, discount) => setDiscountCents(discount)} />
        </Card>

        {/* Какво следва */}
        <Card className="p-6 bg-muted border-0">
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
            След плащането
          </h2>
          <ul className="space-y-3 text-sm">
            <Step icon={<CheckIcon size={16} />}>
              Съдържанието се отключва незабавно.
            </Step>
            <Step icon={<MailIcon size={16} />}>
              Получавате имейл с линк за сваляне.
            </Step>
            <Step icon={<DownloadIcon size={16} />}>
              {isLoggedIn
                ? "Достъп завинаги от раздел „Моите книги“."
                : "Линкът е валиден 30 дни. С профил достъпът е завинаги."}
            </Step>
          </ul>
        </Card>

        <Card className="p-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox required className="mt-0.5" />
            <span className="text-sm leading-snug">
              Съгласен съм достъпът да бъде предоставен незабавно и потвърждавам,
              че с това губя правото си на отказ съгласно{" "}
              <Link
                href="/vrashtane"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                чл. 57, т. 13 ЗЗП
              </Link>
              . Приемам{" "}
              <Link
                href="/obshti-uslovia"
                target="_blank"
                className="text-primary underline underline-offset-2"
              >
                Общите условия
              </Link>
              .
            </span>
          </label>
        </Card>

        {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}
      </div>

      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-24 space-y-4">
          <OrderSummary
            lines={lines}
            subtotalCents={totals.subtotalCents}
            discountCents={discountCents}
            totalCents={liveTotal}
            showShipping={false}
          />

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={pending || !cardEnabled}
          >
            {pending ? "Обработване…" : `Плати ${formatPrice(liveTotal)}`}
          </Button>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Плащането се обработва сигурно от Stripe. Не съхраняваме данни на
            вашата карта.
          </p>
        </div>
      </aside>
    </form>
  );
}

function Step({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="text-primary shrink-0 mt-0.5">{icon}</span>
      <span>{children}</span>
    </li>
  );
}
