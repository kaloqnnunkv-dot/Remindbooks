import "server-only";
import Stripe from "stripe";
import { env, isStripeConfigured } from "./env";

/**
 * Stripe клиентът е опционален: ако ключът липсва, сайтът работи нормално,
 * но плащанията с карта са изключени (полезно преди клиентът да отвори акаунт).
 */
export const stripe = isStripeConfigured
  ? new Stripe(env.stripe.secretKey!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
      appInfo: { name: "ReMindBooks", version: "2.0.0" },
    })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe не е конфигуриран. Задайте STRIPE_SECRET_KEY в променливите на средата.",
    );
  }
  return stripe;
}

export { isStripeConfigured };
