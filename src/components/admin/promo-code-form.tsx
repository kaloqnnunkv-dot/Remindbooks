"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { savePromoCode } from "@/app/actions/admin-content";
import type { AdminState } from "@/app/actions/admin-products";
import { Alert, Button, Checkbox, Field, Input, Select } from "../ui";

const initialState: AdminState = { ok: false, message: "" };

export function PromoCodeForm() {
  const [state, action, pending] = useActionState(savePromoCode, initialState);
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const formRef = useRef<HTMLFormElement>(null);

  // След успешно създаване изчистваме формата, за да е готова за следващия код.
  // Нулирането е страничен ефект и трябва да стане след рендера, не по време на него.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <Field label="Код" htmlFor="pc-code" required error={state.errors?.code}>
        <Input
          id="pc-code"
          name="code"
          required
          maxLength={40}
          placeholder="PROLET2026"
          className="font-mono uppercase"
          onChange={(e) => {
            e.target.value = e.target.value.toUpperCase();
          }}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Тип" htmlFor="pc-type" required>
          <Select
            id="pc-type"
            name="discountType"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FIXED")}
          >
            <option value="PERCENT">Процент</option>
            <option value="FIXED">Сума</option>
          </Select>
        </Field>

        <Field
          label={discountType === "PERCENT" ? "Процент" : "Сума (лв.)"}
          htmlFor="pc-amount"
          required
          error={state.errors?.amountRaw}
        >
          <Input
            id="pc-amount"
            name="amountRaw"
            required
            inputMode="decimal"
            className="font-mono"
            placeholder={discountType === "PERCENT" ? "10" : "5.00"}
          />
        </Field>
      </div>

      <Field
        label="Минимална поръчка (лв.)"
        htmlFor="pc-min"
        hint="Оставете празно, ако няма изискване."
        error={state.errors?.minOrderCents}
      >
        <Input
          id="pc-min"
          name="minOrderCents"
          inputMode="decimal"
          className="font-mono"
          placeholder=""
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Валиден от" htmlFor="pc-start">
          <Input id="pc-start" name="startsAt" type="date" />
        </Field>

        <Field label="Валиден до" htmlFor="pc-end">
          <Input id="pc-end" name="expiresAt" type="date" />
        </Field>
      </div>

      <Field
        label="Максимален брой употреби"
        htmlFor="pc-max"
        hint="Празно = неограничено."
        error={state.errors?.maxUses}
      >
        <Input
          id="pc-max"
          name="maxUses"
          type="number"
          min={1}
          className="font-mono"
        />
      </Field>

      <Field
        label="Описание"
        htmlFor="pc-desc"
        hint="Само за вас — не се вижда от клиентите."
      >
        <Input id="pc-desc" name="description" maxLength={200} />
      </Field>

      <label className="flex items-center gap-2.5 cursor-pointer">
        <Checkbox name="isActive" defaultChecked />
        <span className="text-sm">Активен веднага</span>
      </label>

      {state.message && (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Създаване…" : "Създай код"}
      </Button>
    </form>
  );
}
