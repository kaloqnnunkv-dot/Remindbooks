import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatPrice,
  formatDateTime,
  BG_ORDER_STATUS,
  BG_PAYMENT_METHOD,
  BG_PRODUCT_TYPE,
} from "@/lib/format";
import { statusTone } from "@/lib/order-status";
import { productHref } from "@/components/product-card";
import { Badge, Card, ButtonLink, Breadcrumbs } from "@/components/ui";
import { DownloadIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Детайли за поръчка",
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const order = await db.order.findFirst({
    // Проверката за userId е част от заявката — така чужда поръчка изобщо
    // не може да бъде заредена чрез отгатване на ID.
    where: { id, userId: session!.user.id },
    include: {
      items: {
        include: {
          product: { select: { slug: true, type: true, coverImage: true } },
        },
      },
      promoCode: { select: { code: true } },
    },
  });

  if (!order) notFound();

  // Дигиталните артикули, до които потребителят вече има достъп.
  const entitlements = await db.entitlement.findMany({
    where: {
      userId: session!.user.id,
      productId: {
        in: order.items
          .map((i) => i.productId)
          .filter((v): v is string => Boolean(v)),
      },
    },
    select: { productId: true },
  });
  const ownedIds = new Set(entitlements.map((e) => e.productId));

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Профил", href: "/profil" },
          { label: "Поръчки", href: "/profil/porachki" },
          { label: order.orderNumber },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-mono text-2xl font-bold">{order.orderNumber}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDateTime(order.createdAt)}
          </p>
        </div>
        <Badge tone={statusTone(order.status)}>{BG_ORDER_STATUS[order.status]}</Badge>
      </div>

      {/* Статус на изпращане */}
      {order.status === "SHIPPED" && order.trackingNumber && (
        <Card className="p-4 mb-6 bg-muted border-0">
          <p className="text-sm">
            Поръчката е предадена на куриер. Номер за проследяване:{" "}
            <span className="font-mono font-bold">{order.trackingNumber}</span>
          </p>
        </Card>
      )}

      {/* Артикули */}
      <Card className="divide-y divide-border mb-6">
        {order.items.map((item) => {
          const isDigital =
            item.typeSnapshot === "PDF" || item.typeSnapshot === "AUDIO";
          const canDownload =
            isDigital && item.productId && ownedIds.has(item.productId);

          return (
            <div key={item.id} className="p-5 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {item.product ? (
                    <Link
                      href={productHref({
                        type: item.product.type,
                        slug: item.product.slug,
                      })}
                      className="font-sans font-bold hover:text-primary transition-colors"
                    >
                      {item.titleSnapshot}
                    </Link>
                  ) : (
                    <span className="font-sans font-bold">{item.titleSnapshot}</span>
                  )}
                  <Badge tone="outline">{BG_PRODUCT_TYPE[item.typeSnapshot]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.quantity} × {formatPrice(item.unitCents)}
                </p>
              </div>

              {canDownload && (
                <ButtonLink
                  href={`/api/download/${item.productId}`}
                  variant="outline"
                  size="sm"
                >
                  <DownloadIcon size={15} />
                  Свали
                </ButtonLink>
              )}

              <span className="font-sans font-bold whitespace-nowrap">
                {formatPrice(item.unitCents * item.quantity)}
              </span>
            </div>
          );
        })}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Суми */}
        <Card className="p-5">
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Обобщение
          </h2>
          <dl className="space-y-2 text-sm">
            <Row label="Междинна сума" value={formatPrice(order.subtotalCents)} />
            {order.discountCents > 0 && (
              <Row
                label={`Отстъпка${order.promoCode ? ` (${order.promoCode.code})` : ""}`}
                value={`− ${formatPrice(order.discountCents)}`}
              />
            )}
            {order.giftCardCents > 0 && (
              <Row
                label="Подаръчна карта"
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
            <Row
              label="Начин на плащане"
              value={BG_PAYMENT_METHOD[order.paymentMethod] ?? "—"}
            />
          </dl>
        </Card>

        {/* Доставка */}
        {order.fulfillmentType === "SHIPPING" && (
          <Card className="p-5">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Данни за доставка
            </h2>
            <address className="not-italic text-sm space-y-1 text-foreground/90">
              <p className="font-bold">
                {order.firstName} {order.lastName}
              </p>
              <p>{order.addressLine}</p>
              <p>
                {order.postalCode} {order.city}
              </p>
              <p className="pt-2 text-muted-foreground">{order.phone}</p>
              <p className="text-muted-foreground break-all">{order.email}</p>
            </address>
            {order.notes && (
              <p className="mt-4 pt-4 border-t border-border text-sm text-muted-foreground">
                <span className="font-bold text-foreground">Бележка: </span>
                {order.notes}
              </p>
            )}
          </Card>
        )}
      </div>

      <div className="mt-8">
        <ButtonLink href="/profil/porachki" variant="ghost">
          ← Всички поръчки
        </ButtonLink>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
