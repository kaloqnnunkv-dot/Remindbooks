"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveCategory } from "@/app/actions/admin-products";
import type { AdminState } from "@/app/actions/admin-products";
import { Alert, Button, Field, Input } from "../ui";

const initialState: AdminState = { ok: false, message: "" };

export function CategoryForm() {
  const [state, action, pending] = useActionState(saveCategory, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Изчистваме формата след успешно създаване, за да е готова за следващата.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <Field label="Име" htmlFor="cat-name" required error={state.errors?.name}>
        <Input
          id="cat-name"
          name="name"
          required
          maxLength={80}
          placeholder="напр. Саморазвитие"
        />
      </Field>

      <Field
        label="Ред на показване"
        htmlFor="cat-order"
        hint="По-малките числа се показват първи."
        error={state.errors?.order}
      >
        <Input
          id="cat-order"
          name="order"
          type="number"
          min={0}
          max={999}
          defaultValue={0}
          className="font-mono"
        />
      </Field>

      {state.message && (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Създаване…" : "Създай категория"}
      </Button>
    </form>
  );
}
