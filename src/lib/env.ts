/**
 * Централизиран достъп до променливите на средата.
 *
 * Философията тук е "приложението стартира, дори ако не всичко е конфигурирано".
 * Липсващ Stripe ключ например не бива да събаря целия сайт — само плащанията
 * се изключват. Това позволява поетапно пускане (първо съдържание, после плащания).
 */

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

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProd: process.env.NODE_ENV === "production",

  databaseUrl: required("DATABASE_URL"),
  appUrl: (optional("NEXT_PUBLIC_APP_URL") ?? "http://localhost:3000").replace(/\/$/, ""),

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
    bucket: optional("S3_BUCKET"),
    accessKeyId: optional("S3_ACCESS_KEY_ID"),
    secretAccessKey: optional("S3_SECRET_ACCESS_KEY"),
    /** Публичен CDN домейн за корици и други публични файлове. */
    publicUrl: optional("NEXT_PUBLIC_MEDIA_HOST"),
    /** Локална папка, ако не се използва S3 (напр. Railway volume). */
    localDir: optional("LOCAL_UPLOAD_DIR") ?? "./uploads",
  },

  email: {
    resendApiKey: optional("RESEND_API_KEY"),
    from: optional("EMAIL_FROM") ?? "ReMindBooks <noreply@remindbooks.com>",
    /** Имейлът на собственика — там отиват съобщенията от формата за контакт. */
    ownerEmail: optional("OWNER_EMAIL") ?? "info@remindbooks.com",
  },

  mailerLite: {
    apiKey: optional("MAILERLITE_API_KEY"),
    groupId: optional("MAILERLITE_GROUP_ID"),
  },

  shop: {
    /** Цена на доставка в стотинки. */
    shippingCents: Number(optional("SHIPPING_CENTS") ?? 599),
    /** Безплатна доставка над тази сума (стотинки). 0 = изключено. */
    freeShippingOverCents: Number(optional("FREE_SHIPPING_OVER_CENTS") ?? 5000),
    /** Такса за наложен платеж в стотинки. */
    codFeeCents: Number(optional("COD_FEE_CENTS") ?? 0),
    currency: "bgn",
    currencyLabel: "лв.",
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
