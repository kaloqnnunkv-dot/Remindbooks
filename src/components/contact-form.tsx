"use client";

import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/actions/contact";
import { Alert, Button, Card, Field, Input, Textarea } from "./ui";

const initialState: ContactState = { ok: false, message: "" };

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, initialState);

  if (state.ok) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-success/15 text-success flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 font-sans text-lg font-bold">Съобщението е изпратено</h2>
        <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <form action={action} className="space-y-5" noValidate>
        {/* Honeypot */}
        <div aria-hidden="true" className="absolute -left-[9999px] opacity-0">
          <label htmlFor="website-contact">Уебсайт</label>
          <input
            id="website-contact"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Име" htmlFor="contact-name" required error={state.errors?.name}>
            <Input
              id="contact-name"
              name="name"
              required
              maxLength={100}
              autoComplete="name"
              aria-invalid={Boolean(state.errors?.name)}
            />
          </Field>

          <Field label="Имейл" htmlFor="contact-email" required error={state.errors?.email}>
            <Input
              id="contact-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              aria-invalid={Boolean(state.errors?.email)}
            />
          </Field>
        </div>

        <Field label="Тема" htmlFor="contact-subject" error={state.errors?.subject}>
          <Input
            id="contact-subject"
            name="subject"
            maxLength={150}
            placeholder="Например: въпрос за поръчка №RMB-2026-000123"
          />
        </Field>

        <Field
          label="Съобщение"
          htmlFor="contact-body"
          required
          error={state.errors?.body}
        >
          <Textarea
            id="contact-body"
            name="body"
            required
            minLength={10}
            maxLength={4000}
            rows={7}
            aria-invalid={Boolean(state.errors?.body)}
          />
        </Field>

        {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Изпращане…" : "Изпрати съобщението"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Данните ви се използват само за да отговорим на съобщението.
          </p>
        </div>
      </form>
    </Card>
  );
}
