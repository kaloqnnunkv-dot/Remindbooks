import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { db } from "@/lib/db";
import {
  formatPrice,
  formatDateTime,
  BG_PAYMENT_METHOD,
  BG_PRODUCT_TYPE,
  BG_ORDER_STATUS,
} from "@/lib/format";
import { statusTone } from "@/lib/order-status";
import { AdminHeader } from "@/components/admin/admin-ui";
import { OrderStatusForm } from "@/components/admin/order-status-form";
import { Badge, ButtonLink, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Детайли за поръчка",
  robots: { index: false, follow: false },
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: {
        include: { product: { select: { id: true, slug: true, type: true } } },
      },
      user: { select: { id: true, email: true, name: true } },
      promoCode: { select: { code: true } },
      giftCard: { select: { code: true } },
    },
  });

  if (!order) notFound();

  return (
    <div>
      <AdminHeader
        title={order.orderNumber}
        description={`Създадена на ${formatDateTime(order.createdAt)}`}
        action={
          <ButtonLink href="/admin/porachki" variant="ghost">
            ← Всички поръчки
          </ButtonLink>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Артикули */}
          <Card>
            <div className="p-5 border-b border-border flex items-center justify-between gap-3">
              <h2 className="font-sans text-lg font-bold">Артикули</h2>
              <Badge tone={statusTone(order.status)}>
                {BG_ORDER_STATUS[order.status]}
              </Badge>
            </div>

            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    {item.product ? (
                      <Link
                        href={`/admin/produkti/${item.product.id}`}
                        className="font-sans font-bold hover:text-primary transition-colors"
                      >
                        {item.titleSnapshot}
                      </Link>
                    ) : (
                      <span className="font-sans font-bold">
                        {item.titleSnapshot}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          (продуктът е изтрит)
                        </span>
                      </span>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone="outline">{BG_PRODUCT_TYPE[item.typeSnapshot]}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {item.quantity} × {formatPrice(item.unitCents)}
                      </span>
                    </div>
                  </div>

                  <span className="font-sans font-bold whitespace-nowrap">
                    {formatPrice(item.unitCents * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Суми */}
            <div className="p-5 border-t border-border bg-muted/40">
              <dl className="space-y-2 text-sm max-w-xs ml-auto">
                <Row label="Междинна сума" value={formatPrice(order.subtotalCents)} />
                {order.discountCents > 0 && (
                  <Row
                    label={`Промо${order.promoCode ? ` (${order.promoCode.code})` : ""}`}
                    value={`− ${formatPrice(order.discountCents)}`}
                  />
                )}
                {order.giftCardCents > 0 && (
                  <Row
                    label={`Карта${order.giftCard ? ` (${order.giftCard.code})` : ""}`}
                    value={`− ${formatPrice(order.giftCardCents)}`}
                  />
                )}
                {order.fulfillmentType === "SHIPPING" && (
                  <Row
                    label="Доставка"
                    value={
                      order.shippingCents === 0
                        ? "Безплатна"
                        : formatPrice(order.shippingCents)
                    }
                  />
                )}
                <div className="pt-2 mt-2 border-t border-border flex justify-between font-sans font-bold text-base">
                  <dt>Общо</dt>
                  <dd>{formatPrice(order.totalCents)}</dd>
                </div>
              </dl>
            </div>
          </Card>

          {/* Смяна на статуса */}
          <Card className="p-5">
            <h2 className="font-sans text-lg font-bold mb-4">Обработка</h2>
            <OrderStatusForm
              orderId={order.id}
              currentStatus={order.status}
              trackingNumber={order.trackingNumber ?? ""}
              isShipping={order.fulfillmentType === "SHIPPING"}
              customerEmail={order.email}
            />
          </Card>
        </div>

        {/* Странична колона */}
        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Клиент
            </h2>

            <dl className="space-y-2.5 text-sm">
              {(order.firstName || order.lastName) && (
                <div>
                  <dt className="text-xs text-muted-foreground">Име</dt>
                  <dd className="font-sans font-bold">
                    {order.firstName} {order.lastName}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-muted-foreground">Имейл</dt>
                <dd>
                  <a
                    href={`mailto:${order.email}`}
                    className="text-primary hover:underline break-all"
                  >
                    {order.email}
                  </a>
                </dd>
              </div>

              {order.phone && (
                <div>
                  <dt className="text-xs text-muted-foreground">Телефон</dt>
                  <dd>
                    <a href={`tel:${order.phone}`} className="text-primary hover:underline">
                      {order.phone}
                    </a>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-muted-foreground">Профил</dt>
                <dd>
                  {order.user ? (
                    <Link
                      href={`/admin/potrebiteli/${order.user.id}`}
                      className="text-primary hover:underline"
                    >
                      {order.user.name ?? order.user.email}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Гост поръчка</span>
                  )}
                </dd>
              </div>
            </dl>
          </Card>

          {order.fulfillmentType === "SHIPPING" && (
            <Card className="p-5">
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
                Адрес за доставка
              </h2>
              <address className="not-italic text-sm space-y-0.5">
                <p>{order.addressLine}</p>
                <p>
                  {order.postalCode} {order.city}
                </p>
              </address>
              {order.notes && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-1">Бележка от клиента</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </Card>
          )}

          <Card className="p-5">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Плащане
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Метод</dt>
                <dd>{BG_PAYMENT_METHOD[order.paymentMethod]}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Платена на</dt>
                <dd>{order.paidAt ? formatDateTime(order.paidAt) : "—"}</dd>
              </div>
              {order.shippedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Изпратена на</dt>
                  <dd>{formatDateTime(order.shippedAt)}</dd>
                </div>
              )}
              {order.stripePaymentIntentId && (
                <div>
                  <dt className="text-muted-foreground text-xs">Stripe ID</dt>
                  <dd className="font-mono text-[11px] break-all">
                    {order.stripePaymentIntentId}
                  </dd>
                </div>
              )}
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
