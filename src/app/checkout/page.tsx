import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDetailedCart } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { publicUrl } from "@/lib/storage";
import { env, isStripeConfigured } from "@/lib/env";

import { PageHeader, Alert } from "@/components/ui";
import { CheckoutForm } from "@/components/checkout-form";
import { DigitalCheckoutForm } from "@/components/digital-checkout-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Плащане",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const lines = await getDetailedCart();

  // Празна кошница — няма какво да се плаща.
  if (lines.length === 0) redirect("/kolichka");

  const totals = computeTotals(lines);
  const session = await auth();

  // Предварително попълване от профила — по-малко писане за завърналите се клиенти.
  const user = session?.user?.id
    ? await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true, email: true, phone: true,
          addressLine: true, city: true, postalCode: true,
        },
      })
    : null;

  const [firstName = "", ...rest] = (user?.name ?? "").split(" ");

  const summaryLines = lines.map((l) => ({
    title: l.title,
    quantity: l.quantity,
    unitCents: l.unitCents,
    coverImage: publicUrl(l.coverImage),
    isDigital: l.isDigital,
  }));

  return (
    <div className="container-page py-12">
      <PageHeader
        title={totals.requiresShipping ? "Данни за доставка" : "Плащане"}
        description={
          totals.requiresShipping
            ? "Попълнете адреса за доставка и изберете начин на плащане."
            : "Само имейл и карта — нищо повече не е нужно за дигитално съдържание."
        }
      />

      {!isStripeConfigured && (
        <Alert tone="error" className="mb-6">
          Плащанията с карта в момента не са конфигурирани.
          {env.features.cod && totals.requiresShipping
            ? " Можете да поръчате с наложен платеж."
            : ""}
        </Alert>
      )}

      {totals.requiresShipping ? (
        <CheckoutForm
          lines={summaryLines}
          totals={{
            subtotalCents: totals.subtotalCents,
            shippingCents: totals.shippingCents,
            totalCents: totals.totalCents,
          }}
          defaults={{
            firstName,
            lastName: rest.join(" "),
            email: user?.email ?? session?.user?.email ?? "",
            phone: user?.phone ?? "",
            addressLine: user?.addressLine ?? "",
            city: user?.city ?? "",
            postalCode: user?.postalCode ?? "",
          }}
          codEnabled={env.features.cod}
          cardEnabled={isStripeConfigured}
          giftCardsEnabled={env.features.giftCards}
          shippingCents={env.shop.shippingCents}
          codFeeCents={env.shop.codFeeCents}
          freeShippingOverCents={env.shop.freeShippingOverCents}
        />
      ) : (
        <DigitalCheckoutForm
          lines={summaryLines}
          totals={{
            subtotalCents: totals.subtotalCents,
            totalCents: totals.totalCents,
          }}
          defaultEmail={user?.email ?? session?.user?.email ?? ""}
          isLoggedIn={Boolean(session?.user)}
          cardEnabled={isStripeConfigured}
        />
      )}
    </div>
  );
}
