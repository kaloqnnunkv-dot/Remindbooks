import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatDate, formatPrice, BG_ORDER_STATUS, BG_PRODUCT_TYPE } from "@/lib/format";
import { statusTone } from "@/lib/order-status";
import { AdminHeader, AdminTable, Th, Td, StatTile } from "@/components/admin/admin-ui";
import { EntitlementManager } from "@/components/admin/entitlement-manager";
import { UserRoleToggle } from "@/components/admin/user-role-toggle";
import { Badge, ButtonLink, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Профил на потребител",
  robots: { index: false, follow: false },
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [user, digitalProducts] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true, orderNumber: true, status: true,
            totalCents: true, createdAt: true,
          },
        },
        entitlements: {
          include: {
            product: { select: { id: true, title: true, type: true } },
          },
          orderBy: { grantedAt: "desc" },
        },
        favorites: { select: { id: true } },
        accounts: { select: { provider: true } },
      },
    }),
    db.product.findMany({
      where: { type: { in: ["PDF", "AUDIO"] } },
      orderBy: { title: "asc" },
      select: { id: true, title: true, type: true },
    }),
  ]);

  if (!user) notFound();

  const spent = user.orders
    .filter((o) => ["PAID", "SHIPPED", "COMPLETED"].includes(o.status))
    .reduce((sum, o) => sum + o.totalCents, 0);

  const ownedIds = new Set(user.entitlements.map((e) => e.productId));

  return (
    <div>
      <AdminHeader
        title={user.name ?? user.email}
        description={`Регистриран на ${formatDate(user.createdAt)}`}
        action={
          <ButtonLink href="/admin/potrebiteli" variant="ghost">
            ← Всички потребители
          </ButtonLink>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="Поръчки" value={user.orders.length} />
        <StatTile label="Похарчено" value={formatPrice(spent)} />
        <StatTile label="Дигитално съдържание" value={user.entitlements.length} />
        <StatTile label="Любими" value={user.favorites.length} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Поръчки */}
          <section>
            <h2 className="text-xl mb-4">Поръчки</h2>
            {user.orders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Този потребител още няма поръчки.
              </p>
            ) : (
              <AdminTable>
                <thead>
                  <tr>
                    <Th>Номер</Th>
                    <Th>Дата</Th>
                    <Th>Статус</Th>
                    <Th className="text-right">Сума</Th>
                  </tr>
                </thead>
                <tbody>
                  {user.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/50 transition-colors">
                      <Td>
                        <Link
                          href={`/admin/porachki/${order.id}`}
                          className="font-mono text-xs font-bold text-primary hover:underline"
                        >
                          {order.orderNumber}
                        </Link>
                      </Td>
                      <Td className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(order.createdAt)}
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

          {/* Закупено дигитално съдържание */}
          <section>
            <h2 className="text-xl mb-2">Закупено съдържание</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Тук можете ръчно да отключите или премахнете достъп до PDF книга
              или аудио материал.
            </p>

            <EntitlementManager
              userId={user.id}
              products={digitalProducts}
              owned={user.entitlements.map((e) => ({
                productId: e.productId,
                title: e.product.title,
                type: e.product.type,
                grantedManually: e.grantedManually,
                grantedAt: e.grantedAt.toISOString(),
                downloadCount: e.downloadCount,
              }))}
              availableIds={digitalProducts
                .filter((p) => !ownedIds.has(p.id))
                .map((p) => p.id)}
            />
          </section>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Данни
            </h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Имейл</dt>
                <dd className="break-all">
                  <a href={`mailto:${user.email}`} className="text-primary hover:underline">
                    {user.email}
                  </a>
                </dd>
              </div>

              {user.phone && (
                <div>
                  <dt className="text-xs text-muted-foreground">Телефон</dt>
                  <dd>{user.phone}</dd>
                </div>
              )}

              {user.addressLine && (
                <div>
                  <dt className="text-xs text-muted-foreground">Адрес</dt>
                  <dd>
                    {user.addressLine}
                    <br />
                    {user.postalCode} {user.city}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-muted-foreground">Вход</dt>
                <dd>
                  {[
                    user.passwordHash ? "Парола" : null,
                    ...user.accounts.map((a) => (a.provider === "google" ? "Google" : a.provider)),
                  ]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-muted-foreground">Бюлетин</dt>
                <dd>{user.newsletterOptIn ? "Абониран" : "Не"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Роля
            </h2>
            <UserRoleToggle
              userId={user.id}
              role={user.role}
              isSelf={session?.user?.id === user.id}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}
