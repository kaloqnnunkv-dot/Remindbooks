import { db } from "@/lib/db";

/**
 * Цветовете на темата, които собственикът може да мени от панела.
 *
 * Пълната палитра в `globals.css` е около четиридесет променливи и повечето са
 * производни — сенки, вариации за админ панела, състояния. Тук са изведени
 * само деветте, които наистина определят как изглежда сайтът. Останалите се
 * подреждат около тях.
 *
 * Стойността по подразбиране е същата като в `globals.css`. Държим я и тук, за
 * да може панелът да покаже нещо в кутийката за цвят, преди да е избирано
 * каквото и да е, и за да се вижда кога избраното се различава от изходното.
 */
export type ThemeTokenInfo = {
  /** CSS променливата, която се пренаписва. */
  token: string;
  /** Ключът в таблицата `Setting`. */
  setting: string;
  label: string;
  hint: string;
  fallback: string;
};

export const THEME_TOKENS: readonly ThemeTokenInfo[] = [
  {
    token: "--background",
    setting: "theme_background",
    label: "Фон на страницата",
    hint: "Основният цвят на хартията",
    fallback: "#f5f1e6",
  },
  {
    token: "--foreground",
    setting: "theme_foreground",
    label: "Основен текст",
    hint: "Заглавия и текст за четене",
    fallback: "#342c25",
  },
  {
    token: "--primary",
    setting: "theme_primary",
    label: "Акцент",
    hint: "Бутони, връзки, тънките черти под заглавията",
    fallback: "#745739",
  },
  {
    token: "--primary-foreground",
    setting: "theme_primary_foreground",
    label: "Текст върху акцента",
    hint: "Надписите вътре в цветните бутони",
    fallback: "#ffffff",
  },
  {
    token: "--card",
    setting: "theme_card",
    label: "Фон на картите",
    hint: "Продуктите, публикациите, кутиите с форми",
    fallback: "#fffcf5",
  },
  {
    token: "--border",
    setting: "theme_border",
    label: "Линии и рамки",
    hint: "Рамките на картите и разделителните черти",
    fallback: "#bab19e",
  },
  {
    token: "--muted-foreground",
    setting: "theme_muted_foreground",
    label: "Второстепенен текст",
    hint: "Описания, дати, дребните надписи",
    fallback: "#584b3c",
  },
  {
    token: "--surface-1",
    setting: "theme_surface_1",
    label: "Фон на редуващите се секции",
    hint: "По-тъмната ивица, която разделя секциите",
    fallback: "#cbc6b9",
  },
  {
    token: "--surface-2",
    setting: "theme_surface_2",
    label: "Фон на по-тъмните секции",
    hint: "„За нас“ и бюлетинът на началната страница",
    fallback: "#c4beae",
  },
] as const;

/**
 * Приема само цвят в шестнайсетичен запис.
 *
 * Стойността влиза в `<style>` на страницата, тоест е код, а не текст. Всичко
 * извън този вид се отхвърля — без проверката един ред от базата би могъл да
 * вкара произволен CSS в сайта.
 */
export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value.trim());
}

/** Избраните цветове, както са в базата. Ключът е `setting`. */
export async function getThemeValues(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany({
    where: { key: { in: THEME_TOKENS.map((t) => t.setting) } },
  });
  const out: Record<string, string> = {};
  for (const row of rows) {
    const value = row.value.trim();
    if (isHexColor(value)) out[row.key] = value.toLowerCase();
  }
  return out;
}

/**
 * Правилото, което пренаписва темата.
 *
 * Влиза в `<style>` след таблицата със стилове, затова бие стойностите от
 * `globals.css` без `!important`. Връща null, когато няма избран нито един
 * цвят — тогава на страницата не се добавя нищо.
 */
export async function getThemeCss(): Promise<string | null> {
  const values = await getThemeValues();

  const declarations: string[] = [];
  for (const token of THEME_TOKENS) {
    const value = values[token.setting];
    if (value) declarations.push(`${token.token}:${value}`);
  }

  // Ръбът при фокус трябва да следва акцента, иначе клавиатурната навигация
  // остава с цвят от старата палитра.
  const primary = values["theme_primary"];
  if (primary) declarations.push(`--ring:${primary}`);

  return declarations.length ? `:root{${declarations.join(";")}}` : null;
}
