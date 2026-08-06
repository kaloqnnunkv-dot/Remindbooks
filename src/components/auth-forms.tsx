"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signIn } from "next-auth/react";
import {
  loginUser,
  registerUser,
  requestPasswordReset,
  resetPassword,
  type AuthState,
} from "@/app/actions/auth";
import { Alert, Button, ButtonLink, Checkbox, Field, Input } from "./ui";

const initialState: AuthState = { ok: false, message: "" };

const PROVIDER_ERRORS: Record<string, string> = {
  OAuthAccountNotLinked:
    "Вече има профил с този имейл. Влезте с парола, след което свържете Google от настройките.",
  AccessDenied: "Достъпът беше отказан.",
  Configuration: "Възникна проблем с конфигурацията. Свържете се с нас.",
};

// ------------------------------------------------------------------
// Вход
// ------------------------------------------------------------------

export function LoginForm({
  redirectTo,
  googleEnabled,
  providerError,
}: {
  redirectTo?: string;
  googleEnabled: boolean;
  providerError?: string;
}) {
  const [state, action, pending] = useActionState(loginUser, initialState);

  return (
    <div className="space-y-5">
      {providerError && (
        <Alert tone="error">
          {PROVIDER_ERRORS[providerError] ?? "Входът не бе успешен. Опитайте отново."}
        </Alert>
      )}

      {googleEnabled && (
        <>
          <GoogleButton redirectTo={redirectTo} label="Вход с Google" />
          <Divider />
        </>
      )}

      <form action={action} className="space-y-4" noValidate>
        {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

        <Field label="Имейл" htmlFor="login-email" required error={state.errors?.email}>
          <Input
            id="login-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoFocus
          />
        </Field>

        <Field
          label="Парола"
          htmlFor="login-password"
          required
          error={state.errors?.password}
        >
          <Input
            id="login-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>

        {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Влизане…" : "Влез"}
        </Button>
      </form>

      <p className="text-center">
        <Link
          href="/zabravena-parola"
          className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4"
        >
          Забравена парола?
        </Link>
      </p>
    </div>
  );
}

// ------------------------------------------------------------------
// Регистрация
// ------------------------------------------------------------------

export function RegisterForm({
  redirectTo,
  googleEnabled,
}: {
  redirectTo?: string;
  googleEnabled: boolean;
}) {
  const [state, action, pending] = useActionState(registerUser, initialState);

  if (state.ok && state.message) {
    return <Alert tone="success">{state.message}</Alert>;
  }

  return (
    <div className="space-y-5">
      {googleEnabled && (
        <>
          <GoogleButton redirectTo={redirectTo} label="Регистрация с Google" />
          <Divider />
        </>
      )}

      <form action={action} className="space-y-4" noValidate>
        <Field label="Име" htmlFor="register-name" required error={state.errors?.name}>
          <Input
            id="register-name"
            name="name"
            required
            maxLength={100}
            autoComplete="name"
          />
        </Field>

        <Field
          label="Имейл"
          htmlFor="register-email"
          required
          error={state.errors?.email}
        >
          <Input
            id="register-email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>

        <Field
          label="Парола"
          htmlFor="register-password"
          required
          hint="Минимум 8 символа."
          error={state.errors?.password}
        >
          <Input
            id="register-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </Field>

        <Field
          label="Повторете паролата"
          htmlFor="register-confirm"
          required
          error={state.errors?.confirmPassword}
        >
          <Input
            id="register-confirm"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
          />
        </Field>

        <div className="space-y-2.5 pt-1">
          <label className="flex items-start gap-2.5 cursor-pointer">
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
            <p className="text-xs text-destructive">{state.errors.acceptTerms}</p>
          )}

          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox name="newsletter" className="mt-0.5" />
            <span className="text-sm leading-snug text-muted-foreground">
              Искам да получавам бюлетина с нови заглавия и статии.
            </span>
          </label>
        </div>

        {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Създаване…" : "Създай профил"}
        </Button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------
// Забравена / нова парола
// ------------------------------------------------------------------

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  if (state.ok) {
    return (
      <Alert tone="success">
        {state.message}
        <p className="mt-2 text-xs text-muted-foreground">
          Проверете и папката „Спам“, ако не виждате имейла.
        </p>
      </Alert>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Имейл" htmlFor="forgot-email" required error={state.errors?.email}>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
        />
      </Field>

      {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Изпращане…" : "Изпрати линк за смяна"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, initialState);

  if (state.ok) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.message}</Alert>
        <ButtonLink href="/vhod" size="lg" className="w-full">
          Към входа
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />

      <Field
        label="Нова парола"
        htmlFor="reset-password"
        required
        hint="Минимум 8 символа."
        error={state.errors?.password}
      >
        <Input
          id="reset-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus
        />
      </Field>

      <Field
        label="Повторете паролата"
        htmlFor="reset-confirm"
        required
        error={state.errors?.confirmPassword}
      >
        <Input
          id="reset-confirm"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
        />
      </Field>

      {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Запазване…" : "Запази новата парола"}
      </Button>
    </form>
  );
}

// ------------------------------------------------------------------
// Помощни
// ------------------------------------------------------------------

function GoogleButton({
  redirectTo,
  label,
}: {
  redirectTo?: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        void signIn("google", { callbackUrl: redirectTo ?? "/profil" });
      }}
      className="w-full h-12 inline-flex items-center justify-center gap-3 rounded-md border border-input bg-card font-sans text-sm font-bold hover:bg-muted transition-colors disabled:opacity-60"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.64 6.16-4.64z"
        />
      </svg>
      {loading ? "Пренасочване…" : label}
    </button>
  );
}

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-card px-3 font-sans text-xs uppercase tracking-wider text-muted-foreground">
          или
        </span>
      </div>
    </div>
  );
}
