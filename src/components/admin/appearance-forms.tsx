"use client";

import Image from "next/image";
import { useActionState, useState } from "react";

import {
  saveSiteImage,
  resetSiteImage,
  saveTheme,
  resetTheme,
} from "@/app/actions/admin-content";
import type { ImageSlotInfo } from "@/lib/images";
import type { ThemeTokenInfo } from "@/lib/theme";
import { Button, Card, cn } from "@/components/ui";

type AdminState = { ok: boolean; message: string; errors?: Record<string, string> };
const initialState: AdminState = { ok: false, message: "" };

type ImageRow = ImageSlotInfo & { url: string; custom: boolean };

export function AppearanceForms({
  images,
  tokens,
  themeValues,
}: {
  images: ImageRow[];
  tokens: readonly ThemeTokenInfo[];
  themeValues: Record<string, string>;
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="font-sans text-lg font-bold">Снимки</h2>
        <p className="mt-1 mb-5 max-w-2xl text-sm text-muted-foreground">
          Всяка снимка от оформлението може да се подмени. Докато не е подменена,
          важи вградената. Изрежете я в посоченото съотношение — иначе рамката ще
          я разтегли.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          {images.map((image) => (
            <ImageSlotCard key={image.slot} image={image} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-sans text-lg font-bold">Цветове</h2>
        <p className="mt-1 mb-5 max-w-2xl text-sm text-muted-foreground">
          Останалите цветове в темата се подреждат около тези — сенките и
          вариациите се изчисляват от тях.
        </p>
        <ThemeForm tokens={tokens} values={themeValues} />
      </section>
    </div>
  );
}

/** Едно място за снимка: какво стои там сега, подмяна, връщане на вградената. */
function ImageSlotCard({ image }: { image: ImageRow }) {
  const [saveState, save, saving] = useActionState(saveSiteImage, initialState);
  const [resetState, reset, resetting] = useActionState(resetSiteImage, initialState);
  const [chosen, setChosen] = useState<string | null>(null);

  const state = saveState.message ? saveState : resetState;

  return (
    <Card className="overflow-hidden p-0">
      {/* Логото и снимката за споделяне се гледат цели; останалите се показват
          изрязани, както ще стоят и на сайта. */}
      <div className="relative aspect-[21/9] bg-muted">
        <Image
          src={image.url}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 40vw"
          className={
            image.slot === "logo" || image.slot === "ogImage"
              ? "object-contain p-4"
              : "object-cover"
          }
        />
      </div>

      <div className="p-4">
        <p className="font-sans text-sm font-bold">{image.label}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {image.where}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
          Съотношение {image.ratio} · {image.custom ? "качена" : "вградена"}
        </p>

        <form action={save} className="mt-3">
          <input type="hidden" name="slot" value={image.slot} />
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => setChosen(e.target.files?.[0]?.name ?? null)}
            className="block w-full font-sans text-xs file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:font-sans file:text-xs file:font-bold"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={saving || !chosen}>
              {saving ? "Качване…" : "Запази"}
            </Button>
          </div>
        </form>

        {image.custom && (
          <form action={reset} className="mt-2">
            <input type="hidden" name="slot" value={image.slot} />
            <Button type="submit" size="sm" variant="outline" disabled={resetting}>
              {resetting ? "Връщане…" : "Върни вградената"}
            </Button>
          </form>
        )}

        {state.message && (
          <p
            className={cn(
              "mt-3 font-sans text-xs",
              state.ok ? "text-[var(--success)]" : "text-destructive",
            )}
          >
            {state.message}
          </p>
        )}
      </div>
    </Card>
  );
}

/**
 * Цветовете на темата.
 *
 * Всеки ред има кутийка за избор и поле с шестнайсетичния запис — двете гледат
 * една стойност, за да може цветът да се избере с око или да се впише точно,
 * когато е даден от фирмения стил.
 */
function ThemeForm({
  tokens,
  values,
}: {
  tokens: readonly ThemeTokenInfo[];
  values: Record<string, string>;
}) {
  const [state, action, pending] = useActionState(saveTheme, initialState);
  const [resetState, resetAction, resetting] = useActionState(
    async () => resetTheme(),
    initialState,
  );

  // Полетата се водят тук, за да са в крак кутийката и текстът.
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(tokens.map((t) => [t.setting, values[t.setting] ?? t.fallback])),
  );

  const shown = state.message ? state : resetState;

  return (
    <>
      <form action={action}>
        <div className="grid gap-4 sm:grid-cols-2">
          {tokens.map((token) => {
            const value = draft[token.setting] ?? token.fallback;
            const changed = value.toLowerCase() !== token.fallback.toLowerCase();
            return (
              <div
                key={token.setting}
                className="flex items-start gap-3 rounded-md border border-border bg-card p-3"
              >
                <input
                  type="color"
                  value={value}
                  aria-label={token.label}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [token.setting]: e.target.value }))
                  }
                  className="h-10 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent p-0.5"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm font-bold">{token.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                    {token.hint}
                  </p>
                  <input
                    type="text"
                    name={token.setting}
                    value={value}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [token.setting]: e.target.value }))
                    }
                    spellCheck={false}
                    className="mt-2 w-full rounded-md border border-input bg-background px-2 py-1 font-mono text-xs"
                  />
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {token.token}
                    {changed ? ` · изходен ${token.fallback}` : " · изходен"}
                  </p>
                  {state.errors?.[token.setting] && (
                    <p className="mt-1 font-sans text-xs text-destructive">
                      {state.errors[token.setting]}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Запазване…" : "Запази цветовете"}
          </Button>
          <p className="font-sans text-xs text-muted-foreground">
            Празно поле връща изходния цвят за този ред.
          </p>
        </div>
      </form>

      <form action={resetAction} className="mt-4 border-t border-border pt-4">
        <Button type="submit" variant="outline" size="sm" disabled={resetting}>
          {resetting ? "Връщане…" : "Върни цялата палитра"}
        </Button>
      </form>

      {shown.message && (
        <p
          className={cn(
            "mt-3 font-sans text-sm",
            shown.ok ? "text-[var(--success)]" : "text-destructive",
          )}
        >
          {shown.message}
        </p>
      )}
    </>
  );
}
