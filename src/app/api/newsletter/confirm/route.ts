import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { subscribeToMailerLite } from "@/lib/mailerlite";

export const dynamic = "force-dynamic";

/**
 * Потвърждаване на абонамента от линка в имейла.
 * След потвърждение абонатът се синхронизира с MailerLite.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${env.appUrl}/?newsletter=invalid`);
  }

  const subscriber = await db.newsletterSubscriber.findUnique({
    where: { confirmToken: token },
    select: { id: true, email: true, isConfirmed: true },
  });

  if (!subscriber) {
    return NextResponse.redirect(`${env.appUrl}/?newsletter=invalid`);
  }

  if (!subscriber.isConfirmed) {
    const synced = await subscribeToMailerLite(subscriber.email);

    await db.newsletterSubscriber.update({
      where: { id: subscriber.id },
      data: {
        isConfirmed: true,
        confirmToken: null,
        unsubscribedAt: null,
        syncedToMailerLite: synced,
      },
    });
  }

  return NextResponse.redirect(`${env.appUrl}/?newsletter=confirmed`);
}
