import type { Metadata } from "next";

import { db } from "@/lib/db";
import { formatPrice, formatDate } from "@/lib/format";
import {
  AdminHeader,
  AdminTable,
  Th,
  Td,
  AdminEmpty,
  StatTile,
} from "@/components/admin/admin-ui";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Подаръчни карти",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активна",
  REDEEMED: "Използвана",
  EXPIRED: "Изтекла",
  CANCELLED: "Анулирана",
};

export default async function AdminGiftCardsPage() {
  const [cards, totals] = await Promise.all([
    db.giftCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        purchaser: { select: { email: true } },
        _count: { select: { redemptions: true } },
      },
    }),
    db.giftCard.aggregate({
      _sum: { initialCents: true, balanceCents: true },
      _count: true,
    }),
  ]);

  const issued = totals._sum.initialCents ?? 0;
  const outstanding = totals._sum.balanceCents ?? 0;

  return (
    <div>
      <AdminHeader
        title="Подаръчни карти"
        description="Издадените карти се създават автоматично след успешно плащане."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="Издадени карти" value={totals._count} />
        <StatTile label="Обща стойност" value={formatPrice(issued)} />
        <StatTile
          label="Неизползван остатък"
          value={formatPrice(outstanding)}
          hint="задължение към клиенти"
          tone={outstanding > 0 ? "warning" : "default"}
        />
        <StatTile label="Осребрени" value={formatPrice(issued - outstanding)} />
      </div>

      {cards.length === 0 ? (
        <AdminEmpty
          title="Още няма издадени карти"
          description="Картите се появяват тук веднага след като клиент плати за подаръчна карта."
        />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <Th>Код</Th>
              <Th>Получател</Th>
              <Th className="text-right">Стойност</Th>
              <Th className="text-right">Остатък</Th>
              <Th>Валидна до</Th>
              <Th>Статус</Th>
            </tr>
          </thead>
          <tbody>
            {cards.map((card) => {
              const expired = card.expiresAt && card.expiresAt < new Date();

              return (
                <tr key={card.id} className="hover:bg-muted/50 transition-colors">
                  <Td>
                    <span className="font-mono font-bold">{card.code}</span>
                    <p className="text-xs text-muted-foreground">
                      издадена {formatDate(card.createdAt)}
                    </p>
                  </Td>

                  <Td>
                    {card.recipientName && (
                      <p className="font-sans">{card.recipientName}</p>
                    )}
                    <p className="text-xs text-muted-foreground break-all">
                      {card.recipientEmail}
                    </p>
                    {card.purchaser && (
                      <p className="text-xs text-muted-foreground">
                        от {card.purchaser.email}
                      </p>
                    )}
                  </Td>

                  <Td className="text-right font-sans font-bold whitespace-nowrap">
                    {formatPrice(card.initialCents)}
                  </Td>

                  <Td className="text-right whitespace-nowrap">
                    <span
                      className={
                        card.balanceCents > 0
                          ? "font-sans font-bold"
                          : "text-muted-foreground"
                      }
                    >
                      {formatPrice(card.balanceCents)}
                    </span>
                    {card._count.redemptions > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {card._count.redemptions}{" "}
                        {card._count.redemptions === 1 ? "поръчка" : "поръчки"}
                      </p>
                    )}
                  </Td>

                  <Td className="text-xs text-muted-foreground whitespace-nowrap">
                    {card.expiresAt ? formatDate(card.expiresAt) : "безсрочна"}
                  </Td>

                  <Td>
                    {expired && card.status === "ACTIVE" ? (
                      <Badge tone="destructive">Изтекла</Badge>
                    ) : card.status === "ACTIVE" ? (
                      <Badge tone="success">Активна</Badge>
                    ) : card.status === "REDEEMED" ? (
                      <Badge tone="default">Използвана</Badge>
                    ) : (
                      <Badge tone="destructive">{STATUS_LABELS[card.status]}</Badge>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
