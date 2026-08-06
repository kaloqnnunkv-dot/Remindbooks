"use server";

import { db } from "@/lib/db";
import { contactSchema, fieldErrors } from "@/lib/validation";
import { sendContactMessage } from "@/lib/email";
import { limitByIp } from "@/lib/rate-limit";

export type ContactState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

/**
 * Обработва формата за контакт.
 *
 * Съобщението се записва в базата (за да не се губи, ако имейлът се провали)
 * и се препраща на имейла на собственика с Reply-To към подателя.
 */
export async function submitContact(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const limit = await limitByIp("contact", 5, 3600);
  if (!limit.ok) {
    return {
      ok: false,
      message: "Изпратихте твърде много съобщения. Моля, опитайте по-късно.",
    };
  }

  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  // Honeypot — ботовете попълват скритото поле.
  if (parsed.data.website) {
    return { ok: true, message: "Благодарим! Ще се свържем с вас скоро." };
  }

  const { name, email, subject, body } = parsed.data;

  await db.contactMessage.create({
    data: { name, email, subject: subject || null, body },
  });

  await sendContactMessage({ name, email, subject, body });

  return {
    ok: true,
    message: "Благодарим! Съобщението е получено — ще отговорим възможно най-скоро.",
  };
}
