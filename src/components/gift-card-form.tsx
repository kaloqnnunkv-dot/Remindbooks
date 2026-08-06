"use client";

import { useActionState, useState } from "react";
import { purchaseGiftCard, type GiftCardState } from "@/app/actions/gift-cards";
import { formatPrice } from "@/lib/format";
import { Alert, Button, Card, Field, Input, Textarea, cn } from "./ui";

const initialState: GiftCardState = { ok: false, message: "" };

const PRESET_AMOUNTS = [2000, 3000, 5000, 10000];

export function GiftCardForm() {
  const [state, action, pending] = useActionState(purchaseGiftCard, initialState);
  const [amount, setAmount] = useState("30.00");

  return (
    <Card className="p-6 sm:p-8">
      <form action={action} className="space-y-6" noValidate>
        {/* Стойност */}
        <div>
          <span className="block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Стойност <span className="text-destructive">*</span>
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            {PRESET_AMOUNTS.map((cents) => {
              const value = (cents / 100).toFixed(2);
              const active = amount === value;
              return (
                <button
                  key={cents}
                  type="button"
                  onClick={() => setAmount(value)}
                  aria-pressed={active}
                  className={cn(
                    "h-11 rounded-md border font-sans text-sm font-bold transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary hover:text-primary",
                  )}
                >
                  {formatPrice(cents)}
                </button>
              );
            })}
          </div>

          <Field
            label="Или въведете сума"
            htmlFor="gc-amount"
            hint="От 10.00 до 500.00 лв."
            error={state.errors?.amountCents}
          >
            <Input
              id="gc-amount"
              name="amountCents"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              required
              className="font-mono"
            />
          </Field>
        </div>

        {/* Получател */}
        <div className="pt-6 border-t border-border space-y-4">
          <h2 className="font-sans text-lg font-bold">За кого е подаръкът</h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Име на получателя"
              htmlFor="gc-name"
              error={state.errors?.recipientName}
            >
              <Input id="gc-name" name="recipientName" maxLength={100} autoComplete="off" />
            </Field>

            <Field
              label="Имейл на получателя"
              htmlFor="gc-email"
              required
              error={state.errors?.recipientEmail}
            >
              <Input
                id="gc-email"
                name="recipientEmail"
                type="email"
                required
                autoComplete="off"
              />
            </Field>
          </div>

          <Field label="От кого" htmlFor="gc-from" hint="Ще се покаже в имейла.">
            <Input id="gc-from" name="fromName" maxLength={100} autoComplete="off" />
          </Field>

          <Field
            label="Лично съобщение"
            htmlFor="gc-message"
            hint="По желание — до 500 символа."
            error={state.errors?.message}
          >
            <Textarea id="gc-message" name="message" maxLength={500} rows={4} />
          </Field>
        </div>

        {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Обработване…" : "Купи подаръчна карта"}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          Плащането се обработва сигурно от Stripe. Картата се изпраща веднага
          след потвърждаване на плащането.
        </p>
      </form>
    </Card>
  );
}
