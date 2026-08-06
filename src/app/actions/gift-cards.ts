"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { env, isStripeConfigured } from "@/lib/env";
import { requireStripe } from "@/lib/stripe";
import { generateGiftCardCode } from "@/lib/pricing";
import { giftCardSchema, fieldErrors } from "@/lib/validation";
import { limitByIp } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export type GiftCardState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

const empty: GiftCardState = { ok: false, message: "" };

const MIN_CENTS = 1000; // 10 лв.
const MAX_CENTS = 50000; // 500 лв.

/**
 * Купуване на подаръчна карта.
 *
 * Картата се създава едва след потвърдено плащане (в Stripe webhook-а) —
 * иначе изоставените плащания биха раздавали валидни кодове.
 */
export async function purchaseGiftCard(
  _prev: GiftCardState,
  formData: FormData,
): Promise<GiftCardState> {
  if (!env.features.giftCards) {
    return { ...empty, message: "Подаръчните карти не са налични." };
  }
  if (!isStripeConfigured) {
    return { ...empty, message: "Плащането с карта в момента не е налично." };
  }

  const limit = await limitByIp("gift-card", 10, 900);
  if (!limit.ok) {
    return { ...empty, message: "Твърде много опити. Опитайте по-късно." };
  }

  const parsed = giftCardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { amountCents, recipientEmail, recipientName, message } = parsed.data;

  if (amountCents < MIN_CENTS || amountCents > MAX_CENTS) {
    return {
      ok: false,
      message: "Стойността трябва да е между 10 и 500 лв.",
      errors: { amountCents: "Стойността трябва да е между 10 и 500 лв." },
    };
  }

  const session = await auth();
  const fromName = formData.get("fromName")?.toString().trim() ?? "";

  // Кодът се генерира сега, но се записва в базата чак след плащането.
  let code = generateGiftCardCode();
  for (let i = 0; i < 5; i++) {
    const exists = await db.giftCard.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) break;
    code = generateGiftCardCode();
  }

  let checkoutUrl: string | null = null;

  try {
    const stripe = requireStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: session?.user?.email ?? undefined,
      locale: "bg",
      line_items: [
        {
          price_data: {
            currency: env.shop.currency,
            product_data: {
              name: `Подаръчна карта Remind Books — ${(amountCents / 100).toFixed(2)} лв.`,
              description: `За: ${recipientName || recipientEmail}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        kind: "gift_card",
        code,
        amountCents: String(amountCents),
        recipientEmail,
        recipientName: recipientName ?? "",
        message: message ?? "",
        fromName: fromName || session?.user?.name || "",
        purchaserId: session?.user?.id ?? "",
      },
      success_url: `${env.appUrl}/podaruchni-karti/uspeh`,
      cancel_url: `${env.appUrl}/podaruchni-karti?cancelled=1`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    checkoutUrl = checkoutSession.url;
  } catch (err) {
    console.error("[gift-card] Stripe сесията се провали:", err);
    return { ...empty, message: "Плащането не можа да бъде стартирано." };
  }

  if (!checkoutUrl) {
    return { ...empty, message: "Плащането не можа да бъде стартирано." };
  }

  redirect(checkoutUrl);
}
