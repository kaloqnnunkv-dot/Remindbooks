/** Валутата е фиксирана за проекта. Тук нарочно НЕ се импортира `env`,
 *  за да може модулът да се използва и в клиентски компоненти. */
const CURRENCY_LABEL = "лв.";

/** Форматира сума в стотинки като "24,90 лв." */
export function formatPrice(cents: number): string {
  const value = (cents / 100).toLocaleString("bg-BG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value} ${CURRENCY_LABEL}`;
}

/** Форматира дата на български: "5 август 2026 г." */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("bg-BG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Форматира продължителност в секунди като "1 ч 24 мин" или "8 мин 30 сек". */
export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h} ч ${m} мин`;
  if (m > 0) return s > 0 ? `${m} мин ${s} сек` : `${m} мин`;
  return `${s} сек`;
}

/** Транслитерира кирилица на латиница и създава URL-безопасен slug. */
const CYRILLIC_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s",
  т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sht",
  ъ: "a", ь: "y", ю: "yu", я: "ya",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join("")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Изрязва текст до определена дължина, без да реже думи по средата. */
export function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

/** Премахва HTML тагове — за автоматични кратки описания и мета тагове. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Изчислява процент отстъпка между стара и нова цена. */
export function discountPercent(priceCents: number, compareAtCents?: number | null): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round(((compareAtCents - priceCents) / compareAtCents) * 100);
}

export const BG_ORDER_STATUS: Record<string, string> = {
  PENDING: "Чакаща",
  PAID: "Платена",
  SHIPPED: "Изпратена",
  COMPLETED: "Завършена",
  CANCELLED: "Отказана",
  REFUNDED: "Възстановена",
};

export const BG_PRODUCT_TYPE: Record<string, string> = {
  PHYSICAL: "Физическа книга",
  PDF: "PDF книга",
  AUDIO: "Аудио",
};

export const BG_PAYMENT_METHOD: Record<string, string> = {
  CARD: "Карта",
  COD: "Наложен платеж",
};
