import type { Metadata } from "next";

import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/format";
import { AdminHeader, AdminTable, Th, Td, AdminEmpty } from "@/components/admin/admin-ui";
import { PromoCodeForm } from "@/components/admin/promo-code-form";
import { PromoRowActions } from "@/components/admin/promo-row-actions";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Промо кодове",
  robots: { index: false, follow: false },
};

export default async function AdminPromoPage() {
  const codes = await db.promoCode.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { orders: true } } },
  });

  const now = new Date();

  return (
    <div>
      <AdminHeader
        title="Промо кодове"
        description="Създаване на кодове за отстъпка с ограничение по дата и брой употреби."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {codes.length === 0 ? (
            <AdminEmpty
              title="Още няма промо кодове"
              description="Създайте първия си код с формата вдясно."
            />
          ) : (
            <AdminTable>
              <thead>
                <tr>
                  <Th>Код</Th>
                  <Th>Отстъпка</Th>
                  <Th>Валидност</Th>
                  <Th className="text-center">Употреби</Th>
                  <Th>Статус</Th>
                  <Th className="text-right">Действия</Th>
                </tr>
              </thead>
              <tbody>
                {codes.map((promo) => {
                  const expired = promo.expiresAt && promo.expiresAt < now;
                  const notStarted = promo.startsAt && promo.startsAt > now;
                  const exhausted =
                    promo.maxUses !== null && promo.usedCount >= promo.maxUses;

                  return (
                    <tr key={promo.id} className="hover:bg-muted/50 transition-colors">
                      <Td>
                        <span className="font-mono font-bold">{promo.code}</span>
                        {promo.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {promo.description}
                          </p>
                        )}
                      </Td>

                      <Td className="whitespace-nowrap">
                        <span className="font-sans font-bold">
                          {promo.discountType === "PERCENT"
                            ? `−${promo.amount}%`
                            : `−${formatPrice(promo.amount)}`}
                        </span>
                        {promo.minOrderCents && (
                          <p className="text-xs text-muted-foreground">
                            над {formatPrice(promo.minOrderCents)}
                          </p>
                        )}
                      </Td>

                      <Td className="text-xs text-muted-foreground whitespace-nowrap">
                        {promo.startsAt && <div>от {formatDate(promo.startsAt)}</div>}
                        {promo.expiresAt ? (
                          <div>до {formatDate(promo.expiresAt)}</div>
                        ) : (
                          !promo.startsAt && <div>безсрочен</div>
                        )}
                      </Td>

                      <Td className="text-center tabular-nums">
                        {promo.usedCount}
                        {promo.maxUses !== null && (
                          <span className="text-muted-foreground"> / {promo.maxUses}</span>
                        )}
                      </Td>

                      <Td>
                        {!promo.isActive ? (
                          <Badge tone="default">Изключен</Badge>
                        ) : expired ? (
                          <Badge tone="destructive">Изтекъл</Badge>
                        ) : notStarted ? (
                          <Badge tone="warning">Предстоящ</Badge>
                        ) : exhausted ? (
                          <Badge tone="destructive">Изчерпан</Badge>
                        ) : (
                          <Badge tone="success">Активен</Badge>
                        )}
                      </Td>

                      <Td className="text-right">
                        <PromoRowActions
                          promoId={promo.id}
                          isActive={promo.isActive}
                          hasOrders={promo._count.orders > 0}
                        />
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </AdminTable>
          )}
        </div>

        <aside className="lg:col-span-1">
          <Card className="p-6 lg:sticky lg:top-24">
            <h2 className="font-sans text-lg font-bold mb-4">Нов промо код</h2>
            <PromoCodeForm />
          </Card>
        </aside>
      </div>
    </div>
  );
}
