/**
 * Конфигурация, безопасна за клиентски компоненти.
 *
 * Съдържа САМО NEXT_PUBLIC_* променливи. Не импортирайте `env.ts` в компонент
 * с "use client" — там се четат сървърни тайни (DATABASE_URL, Stripe ключове),
 * които не бива да попадат в bundle-а на браузъра.
 *
 * Стойностите се записват буквално (process.env.NEXT_PUBLIC_X), защото Next.js
 * ги замества при build. Динамичен достъп (process.env[name]) не работи.
 */

/**
 * Същата нормализация като в `env.ts` — адресът често се въвежда без
 * протокол, защото таблата на хостинг доставчиците го показват така.
 * Тук е повторена нарочно: този файл не бива да зависи от сървърния модул.
 */
function withProtocol(value: string | undefined): string {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:3000";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed);
  return `${isLocal ? "http" : "https"}://${trimmed}`;
}

export const publicConfig = {
  appUrl: withProtocol(process.env.NEXT_PUBLIC_APP_URL),
  currencyLabel: "€",
  /**
   * Границите за подаръчна карта, в евроцентове.
   *
   * Стоят тук, а не в `env.ts`, защото ги чете и формата в браузъра. `env.ts`
   * ги преизползва, тъй че сървърната проверка и надписът пред клиента не могат
   * да се разминат.
   */
  giftCard: { minCents: 500, maxCents: 25000 },
  /**
   * Тавани за качване, в байтове.
   *
   * Стоят тук по същата причина като границите за подаръчна карта: чете ги и
   * формата в браузъра. Преди надписът под полето обещаваше 500 MB, а сървърът
   * отказваше над 300 — администраторът качваше половин час, за да получи
   * накрая грешка.
   *
   * `media` трябва да остане под `serverActions.bodySizeLimit` в
   * next.config.ts: Server Actions буферират цялото тяло в паметта.
   * 300 MB покриват аудиокнига от над 5 часа при типичен битрейт.
   */
  upload: {
    imageBytes: 8 * 1024 * 1024,
    docBytes: 100 * 1024 * 1024,
    mediaBytes: 300 * 1024 * 1024,
  },
  social: {
    facebook: process.env.NEXT_PUBLIC_FACEBOOK_URL ?? "https://facebook.com",
    tiktok: process.env.NEXT_PUBLIC_TIKTOK_URL ?? "https://tiktok.com",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  },
  contact: {
    phone: process.env.NEXT_PUBLIC_CONTACT_PHONE ?? "+359 000 000 000",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "info@remindbooks.com",
  },
  stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "",
};
