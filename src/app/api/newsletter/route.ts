import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { newsletterSchema } from "@/lib/validation";
import { sendNewsletterConfirm } from "@/lib/email";
import { subscribeToMailerLite } from "@/lib/mailerlite";
import { limitByIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Абонамент за бюлетина.
 *
 * Използва се двойно потвърждение (double opt-in): записваме абоната като
 * непотвърден и изпращаме имейл с линк. Така никой не може да абонира чужд
 * адрес — изискване както на GDPR, така и на MailerLite.
 */
export async function POST(request: NextRequest) {
  const limit = await limitByIp("newsletter", 5, 600);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, message: "Твърде много заявки. Опитайте по-късно." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Невалидна заявка." },
      { status: 400 },
    );
  }

  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        message: parsed.error.issues[0]?.message ?? "Невалиден имейл адрес.",
      },
      { status: 400 },
    );
  }

  // Honeypot
  if (parsed.data.website) {
    return NextResponse.json({ ok: true, message: "Благодарим за абонамента!" });
  }

  const { email, source } = parsed.data;

  const existing = await db.newsletterSubscriber.findUnique({
    where: { email },
    select: { id: true, isConfirmed: true, unsubscribedAt: true },
  });

  if (existing?.isConfirmed && !existing.unsubscribedAt) {
    return NextResponse.json({
      ok: true,
      message: "Вече сте абонирани за бюлетина.",
    });
  }

  const token = randomBytes(24).toString("hex");

  await db.newsletterSubscriber.upsert({
    where: { email },
    create: {
      email,
      confirmToken: token,
      source: source ?? "website",
      isConfirmed: false,
    },
    update: {
      confirmToken: token,
      unsubscribedAt: null,
      source: source ?? "website",
    },
  });

  await sendNewsletterConfirm(email, token);

  return NextResponse.json({
    ok: true,
    message: "Изпратихме имейл за потвърждение. Моля, проверете пощата си.",
  });
}
