import "server-only";
import { env, isEmailConfigured } from "./env";
import { formatPrice, formatDate } from "./format";

/**
 * Транзакционни имейли през Resend (HTTP API — не изисква SMTP порт,
 * което го прави съвместимо с всеки хостинг).
 *
 * Ако RESEND_API_KEY липсва, имейлите се логват в конзолата вместо да се пращат.
 * Така разработката и тестването не изискват външен акаунт.
 */

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<boolean> {
  if (!isEmailConfigured) {
    console.info(`[email:mock] До: ${to} | Тема: ${subject}`);
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.email.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.email.from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo,
      }),
    });

    if (!res.ok) {
      console.error("[email] Грешка от Resend:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Неуспешно изпращане:", err);
    return false;
  }
}

// ------------------------------------------------------------------
// Шаблон
// ------------------------------------------------------------------

/** Обща обвивка с цветовете на бранда, съвместима с имейл клиенти (inline CSS). */
function layout(title: string, content: string): string {
  return `<!doctype html>
<html lang="bg">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5f1e6;font-family:Georgia,'Times New Roman',serif;color:#4a3f35;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e6;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffcf5;border:1px solid #dbd0ba;border-radius:4px;">
        <tr><td style="padding:28px 32px 8px;border-bottom:1px solid #ece5d8;">
          <div style="font-size:20px;font-weight:700;letter-spacing:-0.01em;color:#4a3f35;">Remind Books</div>
          <div style="font-size:12px;color:#7d6b56;margin-top:2px;">Книги за вътрешния компас</div>
        </td></tr>
        <tr><td style="padding:28px 32px;font-size:15px;line-height:1.7;">
          <h1 style="margin:0 0 16px;font-size:20px;color:#4a3f35;">${title}</h1>
          ${content}
        </td></tr>
        <tr><td style="padding:20px 32px;background:#ece5d8;border-top:1px solid #dbd0ba;font-size:12px;color:#7d6b56;">
          <div>Remind Books &middot; <a href="${env.appUrl}" style="color:#a67c52;">remindbooks.com</a></div>
          <div style="margin-top:6px;">Имейл: ${env.contact.email} &middot; Тел.: ${env.contact.phone}</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;"><tr>
    <td style="background:#a67c52;border-radius:4px;">
      <a href="${href}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;font-family:Georgia,serif;">${label}</a>
    </td></tr></table>`;
}

// ------------------------------------------------------------------
// Конкретни имейли
// ------------------------------------------------------------------

type OrderEmailItem = { titleSnapshot: string; quantity: number; unitCents: number };
type OrderEmailData = {
  orderNumber: string;
  email: string;
  firstName?: string | null;
  items: OrderEmailItem[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  isDigital: boolean;
  addressLine?: string | null;
  city?: string | null;
  postalCode?: string | null;
  paymentMethod?: string;
};

function itemsTable(items: OrderEmailItem[]): string {
  const rows = items
    .map(
      (i) => `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #ece5d8;">${i.titleSnapshot}${
          i.quantity > 1 ? ` <span style="color:#7d6b56;">× ${i.quantity}</span>` : ""
        }</td>
        <td align="right" style="padding:8px 0;border-bottom:1px solid #ece5d8;white-space:nowrap;">${formatPrice(
          i.unitCents * i.quantity,
        )}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin:16px 0;">${rows}</table>`;
}

function totalsBlock(d: OrderEmailData): string {
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:4px 0;${bold ? "font-weight:700;font-size:16px;" : "color:#7d6b56;"}">${label}</td>
     <td align="right" style="padding:4px 0;${bold ? "font-weight:700;font-size:16px;" : ""}">${value}</td></tr>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;border-top:1px solid #dbd0ba;padding-top:8px;">
    ${line("Междинна сума", formatPrice(d.subtotalCents))}
    ${d.discountCents > 0 ? line("Отстъпка", `− ${formatPrice(d.discountCents)}`) : ""}
    ${!d.isDigital ? line("Доставка", d.shippingCents === 0 ? "Безплатна" : formatPrice(d.shippingCents)) : ""}
    ${line("Общо", formatPrice(d.totalCents), true)}
  </table>`;
}

export async function sendOrderConfirmation(d: OrderEmailData) {
  const greeting = d.firstName ? `Здравейте, ${d.firstName}!` : "Здравейте!";
  const address =
    !d.isDigital && d.addressLine
      ? `<p style="margin:16px 0 0;color:#7d6b56;font-size:14px;"><strong style="color:#4a3f35;">Адрес за доставка:</strong><br>${d.addressLine}, ${d.city ?? ""} ${d.postalCode ?? ""}</p>`
      : "";

  const digitalNote = d.isDigital
    ? `<p style="margin:16px 0 0;">Вашето съдържание е отключено и е достъпно веднага в профила ви.</p>${button(
        `${env.appUrl}/profil/moite-knigi`,
        "Към моите книги",
      )}`
    : `<p style="margin:16px 0 0;">Ще получите имейл, когато поръчката бъде изпратена.</p>`;

  return sendEmail({
    to: d.email,
    subject: `Потвърждение на поръчка ${d.orderNumber} — Remind Books`,
    html: layout(
      "Благодарим за поръчката!",
      `<p style="margin:0;">${greeting}</p>
       <p>Получихме вашата поръчка <strong>${d.orderNumber}</strong>.</p>
       ${itemsTable(d.items)}
       ${totalsBlock(d)}
       ${address}
       ${digitalNote}`,
    ),
  });
}

export async function sendOrderShipped(d: {
  orderNumber: string;
  email: string;
  firstName?: string | null;
  trackingNumber?: string | null;
}) {
  return sendEmail({
    to: d.email,
    subject: `Поръчка ${d.orderNumber} е изпратена — Remind Books`,
    html: layout(
      "Поръчката ви пътува към вас",
      `<p style="margin:0;">${d.firstName ? `Здравейте, ${d.firstName}!` : "Здравейте!"}</p>
       <p>Поръчка <strong>${d.orderNumber}</strong> беше предадена на куриер.</p>
       ${
         d.trackingNumber
           ? `<p style="margin:16px 0;padding:12px 16px;background:#ece5d8;border-radius:4px;">Номер за проследяване: <strong>${d.trackingNumber}</strong></p>`
           : ""
       }
       <p>Благодарим ви, че избрахте Remind Books.</p>`,
    ),
  });
}

/**
 * Уведомление при смяна на статуса на поръчка (различен от „изпратена“).
 * Текстът се подбира според новия статус.
 */
export async function sendOrderStatusUpdate(d: {
  orderNumber: string;
  email: string;
  firstName?: string | null;
  status: "PAID" | "COMPLETED" | "CANCELLED" | "REFUNDED" | "PENDING";
}) {
  const COPY: Record<string, { subject: string; title: string; body: string }> = {
    PAID: {
      subject: `Плащането по поръчка ${d.orderNumber} е потвърдено`,
      title: "Плащането е потвърдено",
      body: "Получихме плащането ви. Започваме подготовката на поръчката.",
    },
    COMPLETED: {
      subject: `Поръчка ${d.orderNumber} е завършена`,
      title: "Поръчката е завършена",
      body: "Надяваме се книгите да ви харесат. Ще се радваме да чуем мнението ви.",
    },
    CANCELLED: {
      subject: `Поръчка ${d.orderNumber} е отказана`,
      title: "Поръчката е отказана",
      body: "Поръчката ви беше отказана. Ако плащането е било извършено, сумата ще бъде възстановена. При въпроси, отговорете на този имейл.",
    },
    REFUNDED: {
      subject: `Възстановена сума по поръчка ${d.orderNumber}`,
      title: "Сумата е възстановена",
      body: "Възстановихме заплатената сума. В зависимост от банката ви, преводът може да отнеме до 5 работни дни.",
    },
    PENDING: {
      subject: `Актуализация по поръчка ${d.orderNumber}`,
      title: "Поръчката ви е в обработка",
      body: "Статусът на поръчката ви беше променен. При въпроси, отговорете на този имейл.",
    },
  };

  const copy = COPY[d.status] ?? COPY.PENDING!;

  return sendEmail({
    to: d.email,
    subject: copy.subject,
    html: layout(
      copy.title,
      `<p style="margin:0;">${d.firstName ? `Здравейте, ${d.firstName}!` : "Здравейте!"}</p>
       <p>${copy.body}</p>
       <p style="color:#7d6b56;font-size:13px;">Номер на поръчката: <strong>${d.orderNumber}</strong></p>`,
    ),
  });
}

export async function sendPasswordReset(email: string, token: string) {
  const url = `${env.appUrl}/nova-parola?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Възстановяване на парола — Remind Books",
    html: layout(
      "Възстановяване на парола",
      `<p style="margin:0;">Получихме заявка за нова парола за вашия профил.</p>
       ${button(url, "Задай нова парола")}
       <p style="color:#7d6b56;font-size:13px;">Линкът е валиден 1 час. Ако не сте заявили смяна на паролата, просто игнорирайте този имейл.</p>`,
    ),
  });
}

export async function sendDigitalDelivery(d: {
  email: string;
  orderNumber: string;
  items: { title: string; url: string }[];
}) {
  const links = d.items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #ece5d8;">
          <div style="font-weight:700;">${i.title}</div>
          <a href="${i.url}" style="color:#a67c52;font-size:14px;">Свали / отвори →</a>
        </td></tr>`,
    )
    .join("");

  return sendEmail({
    to: d.email,
    subject: `Вашето съдържание е готово — ${d.orderNumber}`,
    html: layout(
      "Приятно четене и слушане!",
      `<p style="margin:0;">Плащането по поръчка <strong>${d.orderNumber}</strong> е успешно. Ето вашето съдържание:</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:15px;">${links}</table>
       <p style="color:#7d6b56;font-size:13px;">Ако имате профил, съдържанието е достъпно завинаги и в раздел „Моите книги“.</p>`,
    ),
  });
}

export async function sendContactMessage(d: {
  name: string;
  email: string;
  subject?: string;
  body: string;
}) {
  return sendEmail({
    to: env.email.ownerEmail,
    replyTo: d.email,
    subject: `Ново съобщение от сайта${d.subject ? `: ${d.subject}` : ""}`,
    html: layout(
      "Ново съобщение от формата за контакт",
      `<p style="margin:0;"><strong>От:</strong> ${d.name} (${d.email})</p>
       ${d.subject ? `<p><strong>Тема:</strong> ${d.subject}</p>` : ""}
       <div style="margin-top:16px;padding:16px;background:#f5f1e6;border-radius:4px;white-space:pre-wrap;">${d.body
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")}</div>`,
    ),
  });
}

export async function sendNewsletterConfirm(email: string, token: string) {
  const url = `${env.appUrl}/api/newsletter/confirm?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Потвърдете абонамента си — Remind Books",
    html: layout(
      "Още една стъпка",
      `<p style="margin:0;">Благодарим ви за интереса към бюлетина на Remind Books!</p>
       <p>Моля, потвърдете абонамента си с бутона отдолу.</p>
       ${button(url, "Потвърждавам абонамента")}
       <p style="color:#7d6b56;font-size:13px;">Ако не сте заявявали абонамент, игнорирайте този имейл.</p>`,
    ),
  });
}

export async function sendGiftCard(d: {
  to: string;
  code: string;
  amountCents: number;
  fromName?: string | null;
  message?: string | null;
  expiresAt?: Date | null;
}) {
  return sendEmail({
    to: d.to,
    subject: "Получихте подаръчна карта за Remind Books",
    html: layout(
      "Подарък за вас",
      `<p style="margin:0;">${d.fromName ? `${d.fromName} ви изпраща` : "Получавате"} подаръчна карта на стойност <strong>${formatPrice(
        d.amountCents,
      )}</strong>.</p>
       ${
         d.message
           ? `<div style="margin:16px 0;padding:16px;background:#f5f1e6;border-left:3px solid #a67c52;font-style:italic;">${d.message
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")}</div>`
           : ""
       }
       <div style="margin:20px 0;padding:20px;background:#ece5d8;border-radius:4px;text-align:center;">
         <div style="font-size:12px;color:#7d6b56;letter-spacing:0.08em;text-transform:uppercase;">Вашият код</div>
         <div style="font-size:26px;font-weight:700;letter-spacing:0.12em;margin-top:8px;font-family:monospace;">${d.code}</div>
       </div>
       <p>Въведете кода при плащане, за да използвате стойността.</p>
       ${button(`${env.appUrl}/knigi`, "Разгледай книгите")}
       ${
         d.expiresAt
           ? `<p style="color:#7d6b56;font-size:13px;">Валидна до ${formatDate(d.expiresAt)}.</p>`
           : ""
       }`,
    ),
  });
}

export async function sendLowStockAlert(products: { title: string; stock: number }[]) {
  const rows = products
    .map(
      (p) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #ece5d8;">${p.title}</td>
         <td align="right" style="padding:6px 0;border-bottom:1px solid #ece5d8;color:#b54a35;font-weight:700;">${p.stock} бр.</td></tr>`,
    )
    .join("");

  return sendEmail({
    to: env.email.ownerEmail,
    subject: "Ниска наличност на книги — Remind Books",
    html: layout(
      "Наближава изчерпване",
      `<p style="margin:0;">Следните заглавия имат ниска наличност:</p>
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;font-size:14px;">${rows}</table>
       ${button(`${env.appUrl}/admin/nalichnosti`, "Управление на наличности")}`,
    ),
  });
}
