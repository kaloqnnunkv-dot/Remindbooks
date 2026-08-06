"use client";

import { useActionState, useState, useTransition } from "react";
import {
  updateProfile,
  changePassword,
  toggleNewsletterOptIn,
  type AuthState,
} from "@/app/actions/auth";
import { Alert, Button, Card, Checkbox, Field, Input } from "./ui";
import { useToast } from "./toast";

const initialState: AuthState = { ok: false, message: "" };

type UserData = {
  name: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  newsletterOptIn: boolean;
  hasPassword: boolean;
  linkedProviders: string[];
};

export function ProfileSettingsForms({ user }: { user: UserData }) {
  return (
    <div className="space-y-6">
      <PersonalDataForm user={user} />
      <PasswordForm hasPassword={user.hasPassword} />
      <NewsletterPreference initial={user.newsletterOptIn} />
      <AccountInfo user={user} />
    </div>
  );
}

function PersonalDataForm({ user }: { user: UserData }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <Card className="p-6">
      <h2 className="font-sans text-lg font-bold mb-1">Лични данни</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Използват се за автоматично попълване при поръчка.
      </p>

      <form action={action} className="space-y-4" noValidate>
        <Field label="Име" htmlFor="p-name" required error={state.errors?.name}>
          <Input
            id="p-name"
            name="name"
            defaultValue={user.name}
            required
            maxLength={100}
            autoComplete="name"
          />
        </Field>

        <Field label="Телефон" htmlFor="p-phone" error={state.errors?.phone}>
          <Input
            id="p-phone"
            name="phone"
            defaultValue={user.phone}
            placeholder="0888 123 456"
            autoComplete="tel"
          />
        </Field>

        <Field label="Адрес" htmlFor="p-address" error={state.errors?.addressLine}>
          <Input
            id="p-address"
            name="addressLine"
            defaultValue={user.addressLine}
            placeholder="ул. „Пример“ №1, вх. А, ап. 5"
            autoComplete="street-address"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Град" htmlFor="p-city" error={state.errors?.city}>
            <Input
              id="p-city"
              name="city"
              defaultValue={user.city}
              autoComplete="address-level2"
            />
          </Field>

          <Field
            label="Пощенски код"
            htmlFor="p-postal"
            error={state.errors?.postalCode}
          >
            <Input
              id="p-postal"
              name="postalCode"
              defaultValue={user.postalCode}
              autoComplete="postal-code"
            />
          </Field>
        </div>

        {state.message && (
          <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Запазване…" : "Запази промените"}
        </Button>
      </form>
    </Card>
  );
}

function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, initialState);

  return (
    <Card className="p-6">
      <h2 className="font-sans text-lg font-bold mb-1">
        {hasPassword ? "Смяна на парола" : "Задаване на парола"}
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        {hasPassword
          ? "Изберете силна парола, която не използвате другаде."
          : "Влизате с Google. Задайте парола, за да можете да влизате и без него."}
      </p>

      <form action={action} className="space-y-4" noValidate>
        {hasPassword && (
          <Field
            label="Текуща парола"
            htmlFor="pw-current"
            required
            error={state.errors?.currentPassword}
          >
            <Input
              id="pw-current"
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
            />
          </Field>
        )}

        <Field
          label="Нова парола"
          htmlFor="pw-new"
          required
          hint="Минимум 8 символа."
          error={state.errors?.password}
        >
          <Input
            id="pw-new"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>

        <Field
          label="Повторете новата парола"
          htmlFor="pw-confirm"
          required
          error={state.errors?.confirmPassword}
        >
          <Input
            id="pw-confirm"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
          />
        </Field>

        {state.message && (
          <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? "Запазване…" : hasPassword ? "Смени паролата" : "Задай парола"}
        </Button>
      </form>
    </Card>
  );
}

function NewsletterPreference({ initial }: { initial: boolean }) {
  const [optIn, setOptIn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onChange(checked: boolean) {
    const previous = optIn;
    setOptIn(checked);

    startTransition(async () => {
      const res = await toggleNewsletterOptIn(checked);
      if (!res.ok) {
        setOptIn(previous);
        toast(res.message, "error");
        return;
      }
      toast(res.message);
    });
  }

  return (
    <Card className="p-6">
      <h2 className="font-sans text-lg font-bold mb-1">Бюлетин</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Нови заглавия и статии веднъж месечно. Можете да се отпишете по всяко време.
      </p>

      <label className="flex items-start gap-3 cursor-pointer">
        <Checkbox
          checked={optIn}
          disabled={pending}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm">
          Искам да получавам бюлетина на Remind Books.
        </span>
      </label>
    </Card>
  );
}

function AccountInfo({ user }: { user: UserData }) {
  return (
    <Card className="p-6 bg-muted border-0">
      <h2 className="font-sans text-lg font-bold mb-4">Профил</h2>

      <dl className="space-y-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Имейл</dt>
          <dd className="font-mono break-all">{user.email}</dd>
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-muted-foreground">Начин на вход</dt>
          <dd>
            {[
              user.hasPassword ? "Парола" : null,
              ...user.linkedProviders.map((p) =>
                p === "google" ? "Google" : p,
              ),
            ]
              .filter(Boolean)
              .join(", ")}
          </dd>
        </div>
      </dl>

      <p className="mt-5 pt-5 border-t border-border text-xs text-muted-foreground leading-relaxed">
        Ако желаете профилът и данните ви да бъдат изтрити, пишете ни и ще го
        направим в рамките на 30 дни съгласно GDPR.
      </p>
    </Card>
  );
}
