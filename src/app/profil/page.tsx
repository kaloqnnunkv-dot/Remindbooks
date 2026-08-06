import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice, formatDate, BG_ORDER_STATUS } from "@/lib/format";
import { Card, Badge, ButtonLink, EmptyState } from "@/components/ui";
import { statusTone } from "@/lib/order-status";
import { BookIcon, HeartIcon, PackageIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Моят профил",
  robots: { index: false, follow: false },
};

export default async function ProfileOverviewPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [orderCount, entitlementCount, favoriteCount, recentOrders] =
    await Promise.all([
      db.order.count({ where: { userId } }),
      db.entitlement.count({ where: { userId } }),
      db.favorite.count({ where: { userId } }),
      db.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true, orderNumber: true, status: true,
          totalCents: true, createdAt: true,
          _count: { select: { items: true } },
        },
      }),
    ]);

  return (
    <div>
      <h1 className="text-3xl rule mb-8">Преглед</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Поръчки"
          value={orderCount}
          href="/profil/porachki"
          icon={<PackageIcon size={18} />}
        />
        <StatCard
          label="Моите книги"
          value={entitlementCount}
          href="/profil/moite-knigi"
          icon={<BookIcon size={18} />}
        />
        <StatCard
          label="Любими"
          value={favoriteCount}
          href="/profil/lyubimi"
          icon={<HeartIcon size={18} />}
        />
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-xl">Последни поръчки</h2>
          {orderCount > 3 && (
            <Link
              href="/profil/porachki"
              className="font-sans text-sm font-bold text-primary hover:underline underline-offset-4"
            >
              Всички →
            </Link>
          )}
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            icon={<PackageIcon size={36} />}
            title="Още нямате поръчки"
            description="Когато направите първата си поръчка, тя ще се появи тук."
            action={<ButtonLink href="/knigi">Разгледай книгите</ButtonLink>}
          />
        ) : (
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/profil/porachki/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border border-border rounded-md hover:border-primary transition-colors"
              >
                <div>
                  <p className="font-mono text-sm font-bold">{order.orderNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(order.createdAt)} · {order._count.items}{" "}
                    {order._count.items === 1 ? "артикул" : "артикула"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge tone={statusTone(order.status)}>
                    {BG_ORDER_STATUS[order.status]}
                  </Badge>
                  <span className="font-sans font-bold">
                    {formatPrice(order.totalCents)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: number;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href}>
      <Card className="p-5 hover:border-primary transition-colors h-full">
        <div className="flex items-center justify-between">
          <span className="font-sans text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className="text-primary">{icon}</span>
        </div>
        <p className="mt-2 font-sans text-3xl font-bold tabular-nums">{value}</p>
      </Card>
    </Link>
  );
}
