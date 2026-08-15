"use client";

import { useActionState, useState } from "react";
import { saveSettings } from "@/app/actions/admin-content";
import type { AdminState } from "@/app/actions/admin-products";
import { Alert, Button, Card, Field, Input, Textarea, cn } from "../ui";

const initialState: AdminState = { ok: false, message: "" };

type LegalKey = "privacy" | "cookies" | "terms" | "returns";

type Props = {
  settings: Record<string, string>;
  legalDefaults: Record<LegalKey, string>;
  legalMeta: Record<LegalKey, { slug: string; title: string; description: string }>;
};

const TABS = [
  { key: "home", label: "Начална страница" },
  { key: "about", label: "За нас" },
  { key: "legal", label: "Правни документи" },
] as const;

export function SettingsForms({ settings, legalDefaults, legalMeta }: Props) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("home");

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-6 pb-4 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "px-3.5 py-1.5 rounded-md border font-sans text-xs font-bold transition-colors",
              tab === t.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary hover:text-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "home" && <HomeSettings settings={settings} />}
      {tab === "about" && <AboutSettings settings={settings} />}
      {tab === "legal" && (
        <LegalSettings
          settings={settings}
          defaults={legalDefaults}
          meta={legalMeta}
        />
      )}
    </div>
  );
}

function SaveBar({
  pending,
  state,
}: {
  pending: boolean;
  state: AdminState;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 pt-2">
      <Button type="submit" disabled={pending}>
        {pending ? "Запазване…" : "Запази промените"}
      </Button>
      {state.message && (
        <span
          className={cn(
            "text-sm",
            state.ok ? "text-success" : "text-destructive",
          )}
          role="status"
        >
          {state.message}
        </span>
      )}
    </div>
  );
}

function HomeSettings({ settings }: { settings: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettings, initialState);

  return (
    <form action={action}>
      <Card className="p-6 space-y-4">
        <h2 className="font-sans text-lg font-bold">Секция „За нас“ на началната страница</h2>

        <Field
          label="Кратък текст"
          htmlFor="s-about-short"
          hint="Показва се в блока „Историята зад Remind Books“ на началната страница."
        >
          <Textarea
            id="s-about-short"
            name="about_short"
            defaultValue={settings.about_short ?? ""}
            rows={4}
            maxLength={600}
            placeholder="Remind Books започна с едно просто убеждение…"
          />
        </Field>

        <SaveBar pending={pending} state={state} />
      </Card>
    </form>
  );
}

function AboutSettings({ settings }: { settings: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveSettings, initialState);

  return (
    <form action={action}>
      <Card className="p-6 space-y-5">
        <h2 className="font-sans text-lg font-bold">Страница „За нас“</h2>
        <p className="text-sm text-muted-foreground -mt-3">
          Празните полета показват текста по подразбиране.
        </p>

        <Field label="Заглавие" htmlFor="s-about-title">
          <Input
            id="s-about-title"
            name="about_title"
            defaultValue={settings.about_title ?? ""}
            maxLength={120}
          />
        </Field>

        <Field label="Въведение" htmlFor="s-about-intro">
          <Textarea
            id="s-about-intro"
            name="about_intro"
            defaultValue={settings.about_intro ?? ""}
            rows={3}
            maxLength={600}
          />
        </Field>

        <Field
          label="Нашата история"
          htmlFor="s-about-story"
          hint="Поддържа HTML: <p>, <strong>, <em>."
        >
          <Textarea
            id="s-about-story"
            name="about_story"
            defaultValue={settings.about_story ?? ""}
            rows={10}
            className="font-mono text-xs"
          />
        </Field>

        <Field label="Мисия" htmlFor="s-about-mission">
          <Textarea
            id="s-about-mission"
            name="about_mission"
            defaultValue={settings.about_mission ?? ""}
            rows={3}
            maxLength={400}
          />
        </Field>

        <div className="pt-4 border-t border-border space-y-4">
          <h3 className="font-sans font-bold">Ценности</h3>

          {[1, 2, 3].map((n) => (
            <div key={n} className="grid sm:grid-cols-3 gap-3">
              <Field label={`Ценност ${n} — заглавие`} htmlFor={`s-value-${n}-title`}>
                <Input
                  id={`s-value-${n}-title`}
                  name={`about_values_${n}_title`}
                  defaultValue={settings[`about_values_${n}_title`] ?? ""}
                  maxLength={60}
                />
              </Field>

              <Field
                label={`Ценност ${n} — текст`}
                htmlFor={`s-value-${n}-text`}
                className="sm:col-span-2"
              >
                <Input
                  id={`s-value-${n}-text`}
                  name={`about_values_${n}_text`}
                  defaultValue={settings[`about_values_${n}_text`] ?? ""}
                  maxLength={200}
                />
              </Field>
            </div>
          ))}
        </div>

        <SaveBar pending={pending} state={state} />
      </Card>
    </form>
  );
}

function LegalSettings({
  settings,
  defaults,
  meta,
}: {
  settings: Record<string, string>;
  defaults: Record<LegalKey, string>;
  meta: Record<LegalKey, { slug: string; title: string; description: string }>;
}) {
  const [state, action, pending] = useActionState(saveSettings, initialState);
  const [active, setActive] = useState<LegalKey>("privacy");

  const keys = Object.keys(meta) as LegalKey[];
  const fieldName = `legal_${active}`;
  const currentValue = settings[fieldName] ?? "";

  return (
    <form action={action}>
      <Card className="p-6 space-y-4">
        <h2 className="font-sans text-lg font-bold">Правни документи</h2>

        <Alert>
          Текстовете по подразбиране са съобразени с GDPR и българското
          законодателство и вече съдържат фирмените данни по вписване. Ако
          промените нещо тук, вашата версия замества стандартната — включително
          фирмените данни, тъй че ги пренесете. Препоръчваме окончателен
          преглед от юрист.
        </Alert>

        <div className="flex flex-wrap gap-1.5">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={cn(
                "px-3 py-1.5 rounded-md border font-sans text-xs font-bold transition-colors",
                active === key
                  ? "bg-secondary border-primary text-primary"
                  : "bg-card border-border hover:border-primary",
              )}
            >
              {meta[key].title}
              {settings[`legal_${key}`] && (
                <span className="ml-1.5 text-success" title="Редактиран">
                  •
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Всички полета остават в DOM-а, за да се запазят заедно. */}
        {keys.map((key) => (
          <div key={key} className={active === key ? "" : "hidden"}>
            <Field
              label={meta[key].title}
              htmlFor={`legal-${key}`}
              hint={`Публикува се на /${meta[key].slug}. Празно поле = текст по подразбиране.`}
            >
              <Textarea
                id={`legal-${key}`}
                name={`legal_${key}`}
                defaultValue={settings[`legal_${key}`] ?? ""}
                rows={22}
                className="font-mono text-xs leading-relaxed"
                placeholder={defaults[key].slice(0, 200) + "…"}
              />
            </Field>
          </div>
        ))}

        {!currentValue && (
          <p className="text-xs text-muted-foreground">
            Това поле е празно — на сайта се показва текстът по подразбиране.
            Копирайте го и го редактирайте, ако искате свой вариант.
          </p>
        )}

        <SaveBar pending={pending} state={state} />
      </Card>
    </form>
  );
}
