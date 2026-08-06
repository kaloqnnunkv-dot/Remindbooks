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

export const publicConfig = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  currencyLabel: "лв.",
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
