import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  formatPrice,
  formatDate,
  BG_ORDER_STATUS,
  BG_PAYMENT_METHOD,
} from "@/lib/format";
import { statusTone } from "@/lib/order-status";
import { Badge, ButtonLink, EmptyState } from "@/components/ui";
import { PackageIcon, ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моите поръчки",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const session = await auth();

  const orders = await db.order.findMany({
    where: { userId: session!.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      createdAt: true,
      paymentMethod: true,
      fulfillmentType: true,
      trackingNumber: true,
      items: {
        select: { titleSnapshot: true, quantity: true },
      },
    },
  });

  return (
    <div>
      <h1 className="text-3xl rule mb-8">Моите поръчки</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<PackageIcon size={36} />}
          title="Още нямате поръчки"
          description="Всички ваши поръчки — физически и дигитални — ще се появяват тук."
          action={<ButtonLink href="/knigi">Разгледай книгите</ButtonLink>}
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/profil/porachki/${order.id}`}
              className="block p-5 bg-card border border-border rounded-md hover:border-primary transition-colors group"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-bold">
                      {order.orderNumber}
                    </span>
                    <Badge tone={statusTone(order.status)}>
                      {BG_ORDER_STATUS[order.status]}
                    </Badge>
                    <Badge tone="outline">
                      {order.fulfillmentType === "DIGITAL"
                        ? "Дигитална"
                        : BG_PAYMENT_METHOD[order.paymentMethod]}
                    </Badge>
                  </div>

                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </p>

                  <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
                    {order.items
                      .map(
                        (i) =>
                          `${i.titleSnapshot}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`,
                      )
                      .join(", ")}
                  </p>

                  {order.trackingNumber && (
                    <p className="mt-1.5 text-xs">
                      <span className="text-muted-foreground">Проследяване: </span>
                      <span className="font-mono">{order.trackingNumber}</span>
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-sans font-bold text-lg">
                    {formatPrice(order.totalCents)}
                  </span>
                  <ChevronRightIcon
                    size={18}
                    className="text-muted-foreground group-hover:text-primary transition-colors"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
