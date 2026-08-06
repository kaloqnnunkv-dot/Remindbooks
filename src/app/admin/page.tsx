import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatPrice, formatDate, BG_ORDER_STATUS } from "@/lib/format";
import { statusTone, REVENUE_STATUSES } from "@/lib/order-status";
import { AdminHeader, StatTile, AdminTable, Th, Td, AdminEmpty } from "@/components/admin/admin-ui";
import { Badge, ButtonLink, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Административно табло",
  robots: { index: false, follow: false },
};

export default async function AdminDashboard() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);

  const [
    monthRevenue,
    weekRevenue,
    pendingOrders,
    shippedOrders,
    lowStock,
    newUsers,
    unreadMessages,
    pendingComments,
    recentOrders,
    subscriberCount,
  ] = await Promise.all([
    db.order.aggregate({
      where: { status: { in: REVENUE_STATUSES }, paidAt: { gte: startOfMonth } },
      _sum: { totalCents: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { status: { in: REVENUE_STATUSES }, paidAt: { gte: startOfWeek } },
      _sum: { totalCents: true },
    }),
    db.order.count({ where: { status: "PAID" } }),
    db.order.count({ where: { status: "SHIPPED" } }),
    db.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count FROM "Product"
      WHERE type = 'PHYSICAL' AND "isPublished" = true AND stock <= "lowStockAlert"
    `,
    db.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    db.contactMessage.count({ where: { isRead: false } }),
    db.comment.count({ where: { isApproved: false } }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true, orderNumber: true, status: true, totalCents: true,
        createdAt: true, email: true, firstName: true, lastName: true,
        fulfillmentType: true,
      },
    }),
    db.newsletterSubscriber.count({
      where: { isConfirmed: true, unsubscribedAt: null },
    }),
  ]);

  const lowStockCount = Number(lowStock[0]?.count ?? 0);

  return (
    <div>
      <AdminHeader
        title="Табло"
        description="Бърз преглед на състоянието на магазина."
        action={
          <ButtonLink href="/admin/produkti/nov">Добави продукт</ButtonLink>
        }
      />

      {/* Задачи, изискващи внимание */}
      {(pendingOrders > 0 ||
        lowStockCount > 0 ||
        unreadMessages > 0 ||
        pendingComments > 0) && (
        <Card className="p-5 mb-8 bg-muted border-0">
          <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Изисква вашето внимание
          </h2>
          <ul className="space-y-2 text-sm">
            {pendingOrders > 0 && (
              <TaskLink href="/admin/porachki?status=PAID">
                {pendingOrders}{" "}
                {pendingOrders === 1 ? "платена поръчка чака" : "платени поръчки чакат"}{" "}
                изпращане
              </TaskLink>
            )}
            {lowStockCount > 0 && (
              <TaskLink href="/admin/nalichnosti">
                {lowStockCount}{" "}
                {lowStockCount === 1 ? "заглавие е" : "заглавия са"} с ниска наличност
              </TaskLink>
            )}
            {unreadMessages > 0 && (
              <TaskLink href="/admin/sabshtenia">
                {unreadMessages}{" "}
                {unreadMessages === 1 ? "непрочетено съобщение" : "непрочетени съобщения"}
              </TaskLink>
            )}
            {pendingComments > 0 && (
              <TaskLink href="/admin/komentari">
                {pendingComments}{" "}
                {pendingComments === 1
                  ? "коментар чака одобрение"
                  : "коментара чакат одобрение"}
              </TaskLink>
            )}
          </ul>
        </Card>
      )}

      {/* Статистики */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          label="Приход този месец"
          value={formatPrice(monthRevenue._sum.totalCents ?? 0)}
          hint={`${monthRevenue._count} поръчки`}
          href="/admin/analizi"
        />
        <StatTile
          label="Приход (7 дни)"
          value={formatPrice(weekRevenue._sum.totalCents ?? 0)}
          href="/admin/analizi"
        />
        <StatTile
          label="За изпращане"
          value={pendingOrders}
          tone={pendingOrders > 0 ? "warning" : "default"}
          href="/admin/porachki?status=PAID"
        />
        <StatTile
          label="Изпратени"
          value={shippedOrders}
          href="/admin/porachki?status=SHIPPED"
        />
        <StatTile
          label="Нови регистрации"
          value={newUsers}
          hint="този месец"
          href="/admin/potrebiteli"
        />
        <StatTile
          label="Абонати за бюлетин"
          value={subscriberCount}
          href="/admin/byuletin"
        />
        <StatTile
          label="Ниска наличност"
          value={lowStockCount}
          tone={lowStockCount > 0 ? "destructive" : "default"}
          href="/admin/nalichnosti"
        />
        <StatTile
          label="Непрочетени"
          value={unreadMessages}
          hint="съобщения"
          href="/admin/sabshtenia"
        />
      </div>

      {/* Последни поръчки */}
      <section>
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h2 className="text-xl">Последни поръчки</h2>
          <Link
            href="/admin/porachki"
            className="font-sans text-sm font-bold text-primary hover:underline underline-offset-4"
          >
            Всички →
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <AdminEmpty
            title="Още няма поръчки"
            description="Когато клиент направи поръчка, тя ще се появи тук."
          />
        ) : (
          <AdminTable>
            <thead>
              <tr>
                <Th>Номер</Th>
                <Th>Клиент</Th>
                <Th>Дата</Th>
                <Th>Тип</Th>
                <Th>Статус</Th>
                <Th className="text-right">Сума</Th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                  <Td>
                    <Link
                      href={`/admin/porachki/${order.id}`}
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                  </Td>
                  <Td>
                    <div className="min-w-0">
                      {(order.firstName || order.lastName) && (
                        <p className="truncate">
                          {order.firstName} {order.lastName}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground truncate">
                        {order.email}
                      </p>
                    </div>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground text-xs">
                    {formatDate(order.createdAt)}
                  </Td>
                  <Td>
                    <Badge tone="outline">
                      {order.fulfillmentType === "DIGITAL" ? "Дигитална" : "Доставка"}
                    </Badge>
                  </Td>
                  <Td>
                    <Badge tone={statusTone(order.status)}>
                      {BG_ORDER_STATUS[order.status]}
                    </Badge>
                  </Td>
                  <Td className="text-right font-sans font-bold whitespace-nowrap">
                    {formatPrice(order.totalCents)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        )}
      </section>
    </div>
  );
}

function TaskLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-primary hover:underline underline-offset-4"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
        {children}
      </Link>
    </li>
  );
}
