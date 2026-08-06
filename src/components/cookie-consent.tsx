"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./ui";

const STORAGE_KEY = "rmb_cookie_consent";
const CONSENT_VERSION = 1;

type Consent = {
  version: number;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Consent;
    // Промяна на версията изисква ново съгласие (изискване на GDPR).
    return parsed.version === CONSENT_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * GDPR банер за бисквитки с реален избор (приемане / отказ / настройки).
 *
 * Задължителните бисквитки (сесия, кошница) не подлежат на избор — те са
 * технически необходими. Аналитичните и маркетинговите скриптове се зареждат
 * само след изрично съгласие.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Показваме банера едва след hydration, за да няма разминаване сървър/клиент.
    if (!readConsent()) setVisible(true);
  }, []);

  function save(next: { analytics: boolean; marketing: boolean }) {
    const consent: Consent = {
      version: CONSENT_VERSION,
      necessary: true,
      analytics: next.analytics,
      marketing: next.marketing,
      decidedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    window.dispatchEvent(new CustomEvent("rmb:consent", { detail: consent }));
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Съгласие за бисквитки"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="container-page max-w-4xl">
        <div className="bg-card border border-border rounded-md shadow-lift p-5 sm:p-6">
          <h2 className="font-sans text-base font-bold">Бисквитки</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            Използваме бисквитки, за да работи сайтът коректно и за да подобряваме
            съдържанието. Можете да приемете всички или да откажете
            незадължителните. Повече в{" "}
            <Link href="/biskvitki" className="text-primary underline underline-offset-2">
              Политиката за бисквитки
            </Link>
            .
          </p>

          {showSettings && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <ConsentRow
                title="Задължителни"
                description="Необходими за вход, кошница и плащане. Не могат да бъдат изключени."
                checked
                disabled
              />
              <ConsentRow
                title="Аналитични"
                description="Анонимна статистика кои страници се посещават най-често."
                checked={analytics}
                onChange={setAnalytics}
              />
              <ConsentRow
                title="Маркетингови"
                description="Позволяват показване на релевантни реклами в социалните мрежи."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowSettings((v) => !v)}
              className="sm:mr-auto"
            >
              {showSettings ? "Скрий настройките" : "Настройки"}
            </Button>
            <Button variant="secondary" onClick={() => save({ analytics: false, marketing: false })}>
              Откажи незадължителните
            </Button>
            {showSettings ? (
              <Button onClick={() => save({ analytics, marketing })}>
                Запази избора
              </Button>
            ) : (
              <Button onClick={() => save({ analytics: true, marketing: true })}>
                Приеми всички
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-4 w-4 rounded-sm border border-input accent-[var(--primary)] disabled:opacity-60"
      />
      <span>
        <span className="block font-sans text-sm font-bold">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}
