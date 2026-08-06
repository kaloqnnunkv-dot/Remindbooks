import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { fulfillOrder } from "@/lib/orders";
import { sendGiftCard } from "@/lib/email";

// Webhook-ът трябва да чете суровото тяло на заявката, за да провери подписа.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Stripe webhook.
 *
 * Това е ЕДИНСТВЕНОТО място, което потвърждава плащане. Успешното
 * пренасочване към /checkout/uspeh НЕ е доказателство за плащане — клиентът
 * може да отвори този URL ръчно. Затова наличностите и достъпът до
 * дигиталното съдържание се променят само тук.
 *
 * Обработваните събития:
 *  - checkout.session.completed → изпълнява поръчката
 *  - checkout.session.expired   → отказва неплатената поръчка
 *  - charge.refunded            → маркира поръчката като възстановена
 */
export async function POST(request: NextRequest) {
  if (!stripe || !env.stripe.webhookSecret) {
    console.error("[webhook] Stripe не е конфигуриран.");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      payload,
      signature,
      env.stripe.webhookSecret,
    );
  } catch (err) {
    // Невалиден подпис = заявката не идва от Stripe.
    console.error("[webhook] Невалиден подпис:", (err as Error).message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // Подаръчните карти се купуват през отделна сесия.
        if (session.metadata?.kind === "gift_card") {
          await handleGiftCardPurchase(session);
          break;
        }

        const orderId =
          session.metadata?.orderId ?? session.client_reference_id ?? null;

        if (!orderId) {
          console.error("[webhook] Липсва orderId в сесия", session.id);
          break;
        }

        // Само реално платените сесии водят до изпълнение.
        if (session.payment_status !== "paid") {
          console.warn(
            `[webhook] Сесия ${session.id} е завършена, но статусът е ${session.payment_status}.`,
          );
          break;
        }

        await db.order.update({
          where: { id: orderId },
          data: {
            stripePaymentIntentId:
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : (session.payment_intent?.id ?? null),
          },
        });

        await fulfillOrder(orderId);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        const orderId = session.metadata?.orderId ?? session.client_reference_id;

        if (orderId) {
          // Отказваме само ако още не е платена — иначе не пипаме.
          await db.order.updateMany({
            where: { id: orderId, status: "PENDING", paidAt: null },
            data: { status: "CANCELLED" },
          });
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object;
        const paymentIntentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (paymentIntentId) {
          await db.order.updateMany({
            where: { stripePaymentIntentId: paymentIntentId },
            data: { status: "REFUNDED" },
          });
        }
        break;
      }

      default:
        // Останалите събития не ни интересуват, но потвърждаваме получаването,
        // за да не ги повтаря Stripe.
        break;
    }
  } catch (err) {
    console.error(`[webhook] Грешка при обработка на ${event.type}:`, err);
    // 500 кара Stripe да опита отново — правилно при временна грешка в базата.
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Създава подаръчна карта след успешно плащане и я изпраща на получателя. */
async function handleGiftCardPurchase(session: Stripe.Checkout.Session) {
  const existing = await db.giftCard.findUnique({
    where: { stripeSessionId: session.id },
    select: { id: true },
  });
  // Идемпотентност — Stripe може да достави събитието повече от веднъж.
  if (existing) return;

  const code = session.metadata?.code;
  const amountCents = Number(session.metadata?.amountCents ?? 0);
  const recipientEmail = session.metadata?.recipientEmail;

  if (!code || !amountCents || !recipientEmail) {
    console.error("[webhook] Непълни данни за подаръчна карта", session.id);
    return;
  }

  const card = await db.giftCard.create({
    data: {
      code,
      initialCents: amountCents,
      balanceCents: amountCents,
      status: "ACTIVE",
      recipientEmail,
      recipientName: session.metadata?.recipientName || null,
      message: session.metadata?.message || null,
      purchaserId: session.metadata?.purchaserId || null,
      stripeSessionId: session.id,
      // Валидна една година от покупката.
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });

  await sendGiftCard({
    to: recipientEmail,
    code: card.code,
    amountCents: card.initialCents,
    fromName: session.metadata?.fromName || null,
    message: card.message,
    expiresAt: card.expiresAt,
  });
}
