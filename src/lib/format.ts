/** Валутата е фиксирана за проекта. Тук нарочно НЕ се импортира `env`,
 *  за да може модулът да се използва и в клиентски компоненти. */
const CURRENCY_LABEL = "€";

/** Форматира сума в евроцентове като "12,90 €" */
export function formatPrice(cents: number): string {
  const value = (cents / 100).toLocaleString("bg-BG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${value} ${CURRENCY_LABEL}`;
}

/**
 * Часовата зона на магазина.
 *
 * Моментите се пазят в базата в UTC — така е правилно и не се пипа. Тук се
 * задава изрично зоната, в която се показват, вместо да се разчита на машината:
 * сървърът работи в UTC, тоест без това часовете излизаха с три часа назад през
 * лятото. Изрично зададена, зоната прави и сървърното, и браузърното
 * изчертаване еднакви — иначе всеки посетител виждаше своя час, а React се
 * оплакваше от разминаване при хидратацията.
 */
const TIME_ZONE = "Europe/Sofia";

/** Форматира дата на български: "5 август 2026 г." */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("bg-BG", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  });
}

/** Форматира дата и час: "26.08.2026 г., 12:02". */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("bg-BG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIME_ZONE,
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

/**
 * Превръща описание, писано на ръка, в HTML.
 *
 * Описанията се показват като HTML, а HTML слива редовете: празните редове и
 * тиретата, с които човек подрежда текста в панела, изчезват и всичко излиза
 * слято. Затова текстът се превежда тук, преди да стигне до страницата.
 *
 * Правилата са тези, които всеки пише и без да са му казани:
 *
 *   празен ред        →  нов абзац
 *   нов ред           →  нов ред в същия абзац
 *   „- “ или „• “     →  точка от списък
 *   „1. “ или „1) “   →  точка от номериран списък
 *   **удебелено**     →  удебелено
 *
 * Текст, писан направо на HTML, минава непокътнат — по описанията, въведени
 * преди това, не се пипа. Разпознава се по блоков таг: `<p>`, `<ul>` и така
 * нататък.
 *
 * Всичко останало се екранира, преди да се сглоби. Описанието идва от админ
 * панела, но и там въведеното е текст, не код — една ъглова скоба, написана
 * между другото, не бива да разваля страницата.
 */
const BLOCK_HTML = /<(?:p|div|ul|ol|li|h[1-6]|blockquote|br|table|figure|section)\b/i;

export function richText(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (!text) return "";
  if (BLOCK_HTML.test(text)) return text;

  const escape = (line: string) =>
    line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Удебеляването е след екранирането, за да остане единственият таг,
      // който сами добавяме вътре в реда.
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  const blocks: string[] = [];
  let list: { tag: "ul" | "ol"; items: string[] } | null = null;
  let paragraph: string[] = [];

  const closeList = () => {
    if (!list) return;
    const items = list.items.map((item) => `<li>${item}</li>`).join("");
    blocks.push(`<${list.tag}>${items}</${list.tag}>`);
    list = null;
  };

  const closeParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(`<p>${paragraph.join("<br />")}</p>`);
    paragraph = [];
  };

  const openList = (tag: "ul" | "ol") => {
    closeParagraph();
    if (list === null || list.tag !== tag) {
      closeList();
      list = { tag, items: [] };
    }
    return list;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();

    // Празният ред затваря и списъка, и абзаца — оттам започва ново.
    if (!line) {
      closeList();
      closeParagraph();
      continue;
    }

    const bullet = /^[-*\u2022\u2013\u2014]\s+(.*)$/.exec(line);
    if (bullet) {
      openList("ul").items.push(escape(bullet[1]!));
      continue;
    }

    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (numbered) {
      openList("ol").items.push(escape(numbered[1]!));
      continue;
    }

    closeList();
    paragraph.push(escape(line));
  }

  closeList();
  closeParagraph();
  return blocks.join("");
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
