import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/format";
import { AdminHeader, AdminTable, Th, Td, AdminEmpty } from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Потребители",
  robots: { index: false, follow: false },
};

const PER_PAGE = 30;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stranica?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.stranica) || 1);
  const query = params.q?.trim() ?? "";

  const where = query
    ? {
        OR: [
          { email: { contains: query, mode: "insensitive" as const } },
          { name: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, email: true, name: true, role: true, createdAt: true,
        newsletterOptIn: true,
        _count: { select: { orders: true, entitlements: true, favorites: true } },
        orders: {
          where: { status: { in: ["PAID", "SHIPPED", "COMPLETED"] } },
          select: { totalCents: true },
        },
      },
    }),
    db.user.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <AdminHeader
        title="Потребители"
        description="Всички регистрирани потребители, тяхното закупено съдържание и поръчки."
      />

      <form className="mb-6 flex gap-2 max-w-md" action="/admin/potrebiteli">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Търсене по имейл или име…"
          className="flex-1 h-10 rounded-md border border-input bg-card px-3 text-sm focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25"
        />
        <button
          type="submit"
          className="h-10 px-4 rounded-md bg-secondary text-secondary-foreground border border-border font-sans text-sm font-bold hover:bg-accent transition-colors"
        >
          Търси
        </button>
      </form>

      {users.length === 0 ? (
        <AdminEmpty
          title={query ? "Няма намерени потребители" : "Още няма регистрации"}
          description={
            query
              ? "Опитайте с друга дума."
              : "Потребителите ще се появят тук след първата регистрация."
          }
        />
      ) : (
        <>
          <AdminTable>
            <thead>
              <tr>
                <Th>Потребител</Th>
                <Th>Регистрация</Th>
                <Th className="text-center">Поръчки</Th>
                <Th className="text-right">Похарчено</Th>
                <Th className="text-center">Дигитални</Th>
                <Th>Роля</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const spent = user.orders.reduce((sum, o) => sum + o.totalCents, 0);

                return (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <Td>
                      <Link
                        href={`/admin/potrebiteli/${user.id}`}
                        className="font-sans font-bold hover:text-primary transition-colors"
                      >
                        {user.name ?? "—"}
                      </Link>
                      <p className="text-xs text-muted-foreground break-all">
                        {user.email}
                      </p>
                      {user.newsletterOptIn && (
                        <Badge tone="outline" className="mt-1">
                          Бюлетин
                        </Badge>
                      )}
                    </Td>

                    <Td className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </Td>

                    <Td className="text-center tabular-nums">{user._count.orders}</Td>

                    <Td className="text-right font-sans font-bold whitespace-nowrap">
                      {formatPrice(spent)}
                    </Td>

                    <Td className="text-center tabular-nums">
                      {user._count.entitlements}
                    </Td>

                    <Td>
                      {user.role === "ADMIN" ? (
                        <Badge tone="primary">Администратор</Badge>
                      ) : (
                        <Badge tone="default">Потребител</Badge>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </AdminTable>

          <Pagination
            page={page}
            pages={pages}
            basePath="/admin/potrebiteli"
            searchParams={params}
          />
        </>
      )}
    </div>
  );
}
