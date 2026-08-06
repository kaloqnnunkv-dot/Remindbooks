import "server-only";
import { env, isMailerLiteConfigured } from "./env";

/**
 * Синхронизация на абонати с MailerLite (безплатен план до 1 000 абоната).
 *
 * Липсващият API ключ не е грешка — абонатът се записва в собствената база и
 * може да бъде синхронизиран по-късно (полето syncedToMailerLite).
 */

export async function subscribeToMailerLite(
  email: string,
  fields: { name?: string } = {},
): Promise<boolean> {
  if (!isMailerLiteConfigured) return false;

  try {
    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.mailerLite.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        email,
        fields: fields.name ? { name: fields.name } : undefined,
        groups: env.mailerLite.groupId ? [env.mailerLite.groupId] : undefined,
        status: "active",
      }),
    });

    // 200/201 = създаден или вече съществуващ абонат — и двете са успех.
    if (res.ok) return true;
    console.error("[mailerlite] Грешка:", res.status, await res.text());
    return false;
  } catch (err) {
    console.error("[mailerlite] Неуспешна връзка:", err);
    return false;
  }
}

export async function unsubscribeFromMailerLite(email: string): Promise<boolean> {
  if (!isMailerLiteConfigured) return false;
  try {
    const find = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${env.mailerLite.apiKey}`,
          Accept: "application/json",
        },
      },
    );
    if (!find.ok) return false;
    const data = (await find.json()) as { data?: { id?: string } };
    const id = data.data?.id;
    if (!id) return false;

    const res = await fetch(
      `https://connect.mailerlite.com/api/subscribers/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${env.mailerLite.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "unsubscribed" }),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export { isMailerLiteConfigured };
