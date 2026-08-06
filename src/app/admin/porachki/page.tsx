import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";

import { db } from "@/lib/db";
import {
  formatPrice,
  formatDateTime,
  BG_ORDER_STATUS,
  BG_PAYMENT_METHOD,
} from "@/lib/format";
import { statusTone } from "@/lib/order-status";
import {
  AdminHeader,
  AdminTable,
  Th,
  Td,
  AdminEmpty,
  AdminTabs,
} from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Поръчки",
  robots: { index: false, follow: false },
};

const PER_PAGE = 25;

const STATUS_KEYS: OrderStatus[] = [
  "PENDING",
  "PAID",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; stranica?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.stranica) || 1);
  const status = params.status;
  const query = params.q?.trim() ?? "";

  const where = {
    ...(status && STATUS_KEYS.includes(status as OrderStatus)
      ? { status: status as OrderStatus }
      : {}),
    ...(query
      ? {
          OR: [
            { orderNumber: { contains: query, mode: "insensitive" as const } },
            { email: { contains: query, mode: "insensitive" as const } },
            { lastName: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query } },
          ],
        }
      : {}),
  };

  const [orders, total, statusCounts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, orderNumber: true, status: true, totalCents: true,
        createdAt: true, email: true, firstName: true, lastName: true,
        paymentMethod: true, fulfillmentType: true, trackingNumber: true,
        _count: { select: { items: true } },
      },
    }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (key: string) =>
    statusCounts.find((c) => c.status === key)?._count ?? 0;

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <AdminHeader
        title="Поръчки"
        description="Преглед, филтриране и обработка на всички поръчки."
      />

      <AdminTabs
        basePath="/admin/porachki"
        current={status ?? "all"}
        tabs={[
          { key: "all", label: "Всички" },
          ...STATUS_KEYS.map((key) => ({
            key,
            label: BG_ORDER_STATUS[key]!,
            count: countFor(key),
          })),
        ]}
      />

      <form className="mb-6 flex gap-2 max-w-md" action="/admin/porachki">
        {status && <input type="hidden" name="status" value={status} />}
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Номер, имейл, фамилия или телефон…"
          className="flex-1 h-10 rounded-md border border-input bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
        />
        <button
          type="submit"
          className="h-10 px-4 rounded-md bg-secondary text-secondary-foreground border border-border font-sans text-sm font-bold hover:bg-accent transition-colors"
        >
          Търси
        </button>
      </form>

      {orders.length === 0 ? (
        <AdminEmpty
          title={query || status ? "Няма намерени поръчки" : "Още няма поръчки"}
          description={
            query || status
              ? "Опитайте с друг филтър или дума за търсене."
              : "Първата поръчка ще се появи тук веднага щом клиент направи покупка."
          }
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr>
                <Th>Номер</Th>
                <Th>Клиент</Th>
                <Th>Дата</Th>
                <Th>Тип / Плащане</Th>
                <Th>Статус</Th>
                <Th className="text-right">Сума</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                  <Td>
                    <Link
                      href={`/admin/porachki/${order.id}`}
                      className="font-mono text-xs font-bold text-primary hover:underline"
                    >
                      {order.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order._count.items}{" "}
                      {order._count.items === 1 ? "артикул" : "артикула"}
                    </p>
                  </Td>

                  <Td>
                    {(order.firstName || order.lastName) && (
                      <p className="font-sans">
                        {order.firstName} {order.lastName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground break-all">
                      {order.email}
                    </p>
                  </Td>

                  <Td className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(order.createdAt)}
                  </Td>

                  <Td>
                    <div className="flex flex-col gap-1 items-start">
                      <Badge tone="outline">
                        {order.fulfillmentType === "DIGITAL" ? "Дигитална" : "Доставка"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {BG_PAYMENT_METHOD[order.paymentMethod]}
                      </span>
                    </div>
                  </Td>

                  <Td>
                    <Badge tone={statusTone(order.status)}>
                      {BG_ORDER_STATUS[order.status]}
                    </Badge>
                    {order.trackingNumber && (
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                        {order.trackingNumber}
                      </p>
                    )}
                  </Td>

                  <Td className="text-right font-sans font-bold whitespace-nowrap">
                    {formatPrice(order.totalCents)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <Pagination
            page={page}
            pages={pages}
            basePath="/admin/porachki"
            searchParams={params}
          />
        </>
      )}
    </div>
  );
}
