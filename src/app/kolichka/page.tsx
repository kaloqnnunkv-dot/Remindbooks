import type { Metadata } from "next";

import { getDetailedCart } from "@/lib/cart";
import { computeTotals } from "@/lib/pricing";
import { publicUrl } from "@/lib/storage";
import { env, isStripeConfigured } from "@/lib/env";

import { PageHeader, EmptyState, ButtonLink, Alert } from "@/components/ui";
import { CartView } from "@/components/cart-view";
import { CartIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Кошница",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const lines = await getDetailedCart();
  const totals = computeTotals(lines);

  if (lines.length === 0) {
    return (
      <div className="container-page py-12">
        <PageHeader title="Кошница" />
        <EmptyState
          icon={<CartIcon size={40} />}
          title="Кошницата ви е празна"
          description="Разгледайте каталога и добавете заглавия, които искате да получите."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <ButtonLink href="/knigi">Физически книги</ButtonLink>
              <ButtonLink href="/pdf" variant="outline">
                PDF книги
              </ButtonLink>
              <ButtonLink href="/audio" variant="outline">
                Аудио
              </ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  const unavailable = lines.filter((l) => l.unavailable);

  return (
    <div className="container-page py-12">
      <PageHeader title="Кошница" />

      {!isStripeConfigured && (
        <Alert tone="error" className="mb-6">
          Плащанията с карта в момента не са налични. Моля, свържете се с нас
          за да завършим поръчката ви.
        </Alert>
      )}

      {unavailable.length > 0 && (
        <Alert tone="error" className="mb-6">
          Някои артикули вече не са налични и трябва да бъдат премахнати, преди
          да продължите: {unavailable.map((l) => l.title).join(", ")}.
        </Alert>
      )}

      <CartView
        lines={lines.map((l) => ({
          id: l.productId ?? l.bundleId!,
          kind: l.productId ? "p" : "b",
          slug: l.slug,
          title: l.title,
          type: l.type,
          unitCents: l.unitCents,
          quantity: l.quantity,
          maxQuantity: l.maxQuantity,
          isDigital: l.isDigital,
          coverImage: publicUrl(l.coverImage),
          unavailable: l.unavailable,
        }))}
        totals={{
          subtotalCents: totals.subtotalCents,
          shippingCents: totals.shippingCents,
          totalCents: totals.totalCents,
          requiresShipping: totals.requiresShipping,
          hasDigital: totals.hasDigital,
          freeShippingRemainingCents: totals.freeShippingRemainingCents,
        }}
        freeShippingThresholdCents={env.shop.freeShippingOverCents}
        canCheckout={isStripeConfigured && unavailable.length === 0}
      />
    </div>
  );
}
