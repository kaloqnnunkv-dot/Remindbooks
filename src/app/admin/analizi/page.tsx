import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatPrice, formatDate, BG_PRODUCT_TYPE } from "@/lib/format";
import { REVENUE_STATUSES } from "@/lib/order-status";
import {
  AdminHeader,
  StatTile,
  AdminTable,
  Th,
  Td,
  AdminEmpty,
  AdminTabs,
} from "@/components/admin/admin-ui";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Анализи",
  robots: { index: false, follow: false },
};

type Period = "week" | "month" | "year" | "all";

const PERIOD_LABELS: Record<Period, string> = {
  week: "Последните 7 дни",
  month: "Този месец",
  year: "Тази година",
  all: "От самото начало",
};

function periodStart(period: Period): Date | undefined {
  const now = new Date();
  switch (period) {
    case "week": {
      const d = new Date(now);
      d.setDate(now.getDate() - 7);
      return d;
    }
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
    default:
      return undefined;
  }
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const period = (params.status ?? "month") as Period;
  const from = periodStart(period);

  const dateFilter = from ? { gte: from } : undefined;

  const [revenue, orderCount, newUsers, newSubscribers, topProducts, dailyRows] =
    await Promise.all([
      db.order.aggregate({
        where: { status: { in: REVENUE_STATUSES }, ...(dateFilter ? { paidAt: dateFilter } : {}) },
        _sum: { totalCents: true, discountCents: true, shippingCents: true },
        _avg: { totalCents: true },
        _count: true,
      }),
      db.order.count({
        where: dateFilter ? { createdAt: dateFilter } : {},
      }),
      db.user.count({ where: dateFilter ? { createdAt: dateFilter } : {} }),
      db.newsletterSubscriber.count({
        where: {
          isConfirmed: true,
          unsubscribedAt: null,
          ...(dateFilter ? { createdAt: dateFilter } : {}),
        },
      }),
      // Най-продавани по брой продадени бройки
      db.orderItem.groupBy({
        by: ["productId", "titleSnapshot", "typeSnapshot"],
        where: {
          productId: { not: null },
          order: {
            status: { in: REVENUE_STATUSES },
            ...(dateFilter ? { paidAt: dateFilter } : {}),
          },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
      // Дневен приход за графиката
      from
        ? db.$queryRaw<{ day: Date; total: bigint; orders: bigint }[]>`
            SELECT DATE_TRUNC('day', "paidAt") AS day,
                   SUM("totalCents")::bigint AS total,
                   COUNT(*)::bigint AS orders
            FROM "Order"
            WHERE status IN ('PAID','SHIPPED','COMPLETED')
              AND "paidAt" >= ${from}
            GROUP BY 1 ORDER BY 1 ASC
          `
        : db.$queryRaw<{ day: Date; total: bigint; orders: bigint }[]>`
            SELECT DATE_TRUNC('month', "paidAt") AS day,
                   SUM("totalCents")::bigint AS total,
                   COUNT(*)::bigint AS orders
            FROM "Order"
            WHERE status IN ('PAID','SHIPPED','COMPLETED') AND "paidAt" IS NOT NULL
            GROUP BY 1 ORDER BY 1 ASC
          `,
    ]);

  const totalRevenue = revenue._sum.totalCents ?? 0;
  const chartData = dailyRows.map((r) => ({
    day: new Date(r.day),
    total: Number(r.total),
    orders: Number(r.orders),
  }));
  const maxDaily = Math.max(1, ...chartData.map((d) => d.total));

  return (
    <div>
      <AdminHeader
        title="Анализи"
        description="Приходи, поръчки и най-продавани заглавия по период."
      />

      <AdminTabs
        basePath="/admin/analizi"
        current={period}
        tabs={[
          { key: "week", label: PERIOD_LABELS.week },
          { key: "month", label: PERIOD_LABELS.month },
          { key: "year", label: PERIOD_LABELS.year },
          { key: "all", label: PERIOD_LABELS.all },
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile
          label="Приход"
          value={formatPrice(totalRevenue)}
          hint={PERIOD_LABELS[period]}
        />
        <StatTile
          label="Платени поръчки"
          value={revenue._count}
          hint={`${orderCount} общо създадени`}
        />
        <StatTile
          label="Средна поръчка"
          value={formatPrice(Math.round(revenue._avg.totalCents ?? 0))}
        />
        <StatTile label="Нови регистрации" value={newUsers} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-5">
          <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">
            Дадени отстъпки
          </p>
          <p className="mt-2 font-sans text-xl font-bold">
            {formatPrice(revenue._sum.discountCents ?? 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">
            Приход от доставки
          </p>
          <p className="mt-2 font-sans text-xl font-bold">
            {formatPrice(revenue._sum.shippingCents ?? 0)}
          </p>
        </Card>
        <Card className="p-5">
          <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">
            Абонати за бюлетин
          </p>
          <p className="mt-2 font-sans text-xl font-bold">{newSubscribers}</p>
        </Card>
      </div>

      {/* Приход във времето */}
      <section className="mb-10">
        <h2 className="text-xl mb-4">Приход във времето</h2>

        {chartData.length === 0 ? (
          <AdminEmpty
            title="Още няма данни"
            description="Графиката ще се появи след първата платена поръчка."
          />
        ) : (
          <Card className="p-6">
            <div
              className="flex items-end gap-1 h-48"
              role="img"
              aria-label={`Приход по дни за ${PERIOD_LABELS[period]}`}
            >
              {chartData.map((d, i) => (
                <div
                  key={i}
                  className="flex-1 min-w-1 group relative flex flex-col justify-end h-full"
                >
                  <div
                    className="w-full bg-primary/80 hover:bg-primary rounded-t-sm transition-colors"
                    style={{ height: `${Math.max(2, (d.total / maxDaily) * 100)}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 whitespace-nowrap bg-popover text-popover-foreground border border-border rounded-md px-2 py-1 text-xs shadow-lift">
                    <strong>{formatPrice(d.total)}</strong>
                    <br />
                    {formatDate(d.day)} · {d.orders}{" "}
                    {d.orders === 1 ? "поръчка" : "поръчки"}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-border flex justify-between text-xs text-muted-foreground">
              <span>{chartData[0] && formatDate(chartData[0].day)}</span>
              <span>
                Пик: {formatPrice(maxDaily)}
              </span>
              <span>
                {chartData[chartData.length - 1] &&
                  formatDate(chartData[chartData.length - 1]!.day)}
              </span>
            </div>
          </Card>
        )}
      </section>

      {/* Най-продавани */}
      <section>
        <h2 className="text-xl mb-4">Най-продавани заглавия</h2>

        {topProducts.length === 0 ? (
          <AdminEmpty
            title="Още няма продажби"
            description="Класацията се формира от платените поръчки за избрания период."
          />
        ) : (
          <AdminTable>
            <thead>
              <tr>
                <Th className="w-12">#</Th>
                <Th>Заглавие</Th>
                <Th>Тип</Th>
                <Th className="text-right">Продадени бройки</Th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((item, i) => (
                <tr
                  key={`${item.productId}-${i}`}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <Td className="font-mono text-muted-foreground">{i + 1}</Td>
                  <Td>
                    {item.productId ? (
                      <Link
                        href={`/admin/produkti/${item.productId}`}
                        className="font-sans font-bold hover:text-primary transition-colors"
                      >
                        {item.titleSnapshot}
                      </Link>
                    ) : (
                      <span className="font-sans font-bold">{item.titleSnapshot}</span>
                    )}
                  </Td>
                  <Td className="text-muted-foreground text-xs">
                    {BG_PRODUCT_TYPE[item.typeSnapshot]}
                  </Td>
                  <Td className="text-right font-sans font-bold tabular-nums">
                    {item._sum.quantity ?? 0}
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
