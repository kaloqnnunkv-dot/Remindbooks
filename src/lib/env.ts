/**
 * Централизиран достъп до променливите на средата.
 *
 * Философията тук е "приложението стартира, дори ако не всичко е конфигурирано".
 * Липсващ Stripe ключ например не бива да събаря целия сайт — само плащанията
 * се изключват. Това позволява поетапно пускане (първо съдържание, после плащания).
 */

import { publicConfig } from "./public-config";

/**
 * Цяло неотрицателно число от средата, с резервна стойност.
 *
 * `Number("700 Доставка до адрес")` дава NaN, а NaN се разнася безшумно през
 * всички сметки и накрая цената излиза празна. Затова стойност, която не е
 * чисто число, се отхвърля и се записва в лога, вместо да се приеме.
 */
function wholeNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;

  const parsed = Number(raw.trim());
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    console.warn(
      `[env] ${name}="${raw}" не е цяло число. Използва се ${fallback}.`,
    );
    return fallback;
  }
  return parsed;
}

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function required(name: string, fallback?: string): string {
  const v = optional(name);
  if (v) return v;
  if (fallback !== undefined) return fallback;
  if (process.env.NODE_ENV === "production") {
    throw new Error(`Липсва задължителна променлива на средата: ${name}`);
  }
  return "";
}

/**
 * Нормализира адрес до пълен URL с протокол.
 *
 * Railway, Cloudflare и повечето табла показват адреса без протокол
 * (`remindbooks-production.up.railway.app`), затова е естествено да бъде
 * поставен така. Без протокол `new URL()` хвърля и целият build се проваля,
 * а Stripe и имейлите биха получили невалидни адреси.
 *
 * Локалните адреси остават на http — там няма сертификат.
 */
const FALLBACK_URL = "http://localhost:3000";

function normalizeUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return FALLBACK_URL;

  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(trimmed);
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `${isLocal ? "http" : "https"}://${trimmed}`;

  // Стойността се подава на `new URL()` при компилация. Невалиден адрес
  // проваля целия build, затова проверяваме тук и предупреждаваме ясно,
  // вместо да оставим грешката да изскочи някъде надълбоко.
  try {
    return new URL(withProtocol).origin;
  } catch {
    console.error(
      `[env] NEXT_PUBLIC_APP_URL е невалиден адрес: "${value}". ` +
        `Използва се ${FALLBACK_URL}. Задайте пълен адрес, напр. https://remindbooks.com`,
    );
    return FALLBACK_URL;
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",

  databaseUrl: required("DATABASE_URL"),
  appUrl: normalizeUrl(optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000"),

  auth: {
    secret: required("AUTH_SECRET", "dev-secret-change-me"),
    googleId: optional("GOOGLE_CLIENT_ID"),
    googleSecret: optional("GOOGLE_CLIENT_SECRET"),
  },

  stripe: {
    secretKey: optional("STRIPE_SECRET_KEY"),
    publishableKey: optional("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
    webhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
  },

  storage: {
    endpoint: optional("S3_ENDPOINT"),
    region: optional("S3_REGION") ?? "auto",
    /** Публичен bucket: корици, снимки от блога и безплатни откъси. */
    bucket: optional("S3_BUCKET"),
    /**
     * Частен bucket: пълните PDF и аудио файлове.
     *
     * Държи се отделно, защото публичният адрес на R2 (r2.dev) прави достъпен
     * ЦЕЛИЯ bucket. Ако платените книги стоят в него, всеки с ключа може да ги
     * свали, заобикаляйки плащането. Ако не е зададен, се използва основният —
     * работи, но без това разделение.
     */
    privateBucket: optional("S3_PRIVATE_BUCKET") ?? optional("S3_BUCKET"),
    accessKeyId: optional("S3_ACCESS_KEY_ID"),
    secretAccessKey: optional("S3_SECRET_ACCESS_KEY"),
    /**
     * Отделни ключове за частния bucket.
     *
     * В Cloudflare R2 токенът се ограничава до един bucket. Вместо да се
     * създава един токен с достъп до всичко, всеки bucket си има свой — така
     * изтичането на публичния ключ не дава достъп до платеното съдържание.
     * Ако не са зададени, се използват основните ключове.
     */
    privateAccessKeyId:
      optional("S3_PRIVATE_ACCESS_KEY_ID") ?? optional("S3_ACCESS_KEY_ID"),
    privateSecretAccessKey:
      optional("S3_PRIVATE_SECRET_ACCESS_KEY") ?? optional("S3_SECRET_ACCESS_KEY"),
    /** Публичен CDN домейн за корици и други публични файлове. */
    publicUrl: optional("NEXT_PUBLIC_MEDIA_HOST"),
    /** Локална папка, ако не се използва S3 (напр. Railway volume). */
    localDir: optional("LOCAL_UPLOAD_DIR") ?? "./uploads",
  },

  email: {
    resendApiKey: optional("RESEND_API_KEY"),
    from: optional("EMAIL_FROM") ?? "Remind Books <noreply@remindbooks.com>",
    /** Имейлът на собственика — там отиват съобщенията от формата за контакт. */
    ownerEmail: optional("OWNER_EMAIL") ?? "info@remindbooks.com",
  },

  mailerLite: {
    apiKey: optional("MAILERLITE_API_KEY"),
    groupId: optional("MAILERLITE_GROUP_ID"),
  },

  /**
   * Всички суми са в евроцентове (Int).
   *
   * Магазинът работи в евро от въвеждането му в България. Стойностите по
   * подразбиране тук са в евро — ако в средата е останала сума от времето на
   * лева, тя ще се приложи както е и доставката ще излезе двойно.
   */
  shop: {
    /** Доставка до адрес, в евроцентове. */
    shippingCents: wholeNumber("SHIPPING_CENTS", 700),
    /** Доставка до офис на куриера — обикновено по-евтина. */
    shippingOfficeCents: wholeNumber("SHIPPING_OFFICE_CENTS", 400),
    /** Безплатна доставка над тази сума (евроцентове). 0 = изключено. */
    freeShippingOverCents: wholeNumber("FREE_SHIPPING_OVER_CENTS", 2500),
    /** Такса за наложен платеж в евроцентове. */
    codFeeCents: wholeNumber("COD_FEE_CENTS", 0),
    /** Долна и горна граница за подаръчна карта, в евроцентове. */
    giftCardMinCents: publicConfig.giftCard.minCents,
    giftCardMaxCents: publicConfig.giftCard.maxCents,
    /** Кодът, с който сумите отиват към Stripe (ISO 4217, малки букви). */
    currency: "eur",
    currencyLabel: "€",
  },

  features: {
    cod: optional("FEATURE_COD") !== "false",
    reviews: optional("FEATURE_REVIEWS") !== "false",
    giftCards: optional("FEATURE_GIFT_CARDS") !== "false",
    comments: optional("FEATURE_BLOG_COMMENTS") !== "false",
    googleLogin: Boolean(optional("GOOGLE_CLIENT_ID")),
  },

  social: {
    facebook: optional("NEXT_PUBLIC_FACEBOOK_URL") ?? "https://facebook.com",
    tiktok: optional("NEXT_PUBLIC_TIKTOK_URL") ?? "https://tiktok.com",
    instagram: optional("NEXT_PUBLIC_INSTAGRAM_URL"),
  },

  contact: {
    phone: optional("NEXT_PUBLIC_CONTACT_PHONE") ?? "+359 000 000 000",
    email: optional("NEXT_PUBLIC_CONTACT_EMAIL") ?? "info@remindbooks.com",
  },
};

export const isStripeConfigured = Boolean(env.stripe.secretKey);
export const isStorageConfigured = Boolean(
  env.storage.bucket && env.storage.accessKeyId && env.storage.secretAccessKey,
);
export const isEmailConfigured = Boolean(env.email.resendApiKey);
export const isMailerLiteConfigured = Boolean(env.mailerLite.apiKey);
