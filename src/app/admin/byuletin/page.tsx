import type { Metadata } from "next";

import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { isMailerLiteConfigured } from "@/lib/mailerlite";
import {
  AdminHeader,
  AdminTable,
  Th,
  Td,
  AdminEmpty,
  StatTile,
} from "@/components/admin/admin-ui";
import { ExportSubscribers } from "@/components/admin/export-subscribers";
import { Alert, Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Бюлетин",
  robots: { index: false, follow: false },
};

export default async function AdminNewsletterPage() {
  const [subscribers, confirmed, pending, unsubscribed, synced] = await Promise.all([
    db.newsletterSubscriber.findMany({
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    db.newsletterSubscriber.count({
      where: { isConfirmed: true, unsubscribedAt: null },
    }),
    db.newsletterSubscriber.count({ where: { isConfirmed: false } }),
    db.newsletterSubscriber.count({ where: { unsubscribedAt: { not: null } } }),
    db.newsletterSubscriber.count({ where: { syncedToMailerLite: true } }),
  ]);

  const activeEmails = subscribers
    .filter((s) => s.isConfirmed && !s.unsubscribedAt)
    .map((s) => s.email);

  return (
    <div>
      <AdminHeader
        title="Бюлетин"
        description="Абонатите се записват тук и се синхронизират с MailerLite след потвърждение по имейл."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatTile label="Активни абонати" value={confirmed} tone="success" />
        <StatTile label="Чакат потвърждение" value={pending} />
        <StatTile label="Отписани" value={unsubscribed} />
        <StatTile label="В MailerLite" value={synced} />
      </div>

      {!isMailerLiteConfigured && (
        <Alert className="mb-6">
          MailerLite не е свързан. Абонатите се записват тук и можете да ги
          изтеглите като CSV файл. За автоматична синхронизация задайте
          <code className="mx-1 font-mono text-xs">MAILERLITE_API_KEY</code>
          в настройките на сървъра.
        </Alert>
      )}

      <div className="mb-6">
        <ExportSubscribers emails={activeEmails} />
      </div>

      {subscribers.length === 0 ? (
        <AdminEmpty
          title="Още няма абонати"
          description="Формите за абонамент са на началната страница и във footer-а."
        />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <Th>Имейл</Th>
              <Th>Записан на</Th>
              <Th>Източник</Th>
              <Th>Статус</Th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((sub) => (
              <tr key={sub.id} className="hover:bg-muted/50 transition-colors">
                <Td className="break-all">{sub.email}</Td>
                <Td className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDate(sub.createdAt)}
                </Td>
                <Td className="text-xs text-muted-foreground">{sub.source ?? "—"}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {sub.unsubscribedAt ? (
                      <Badge tone="destructive">Отписан</Badge>
                    ) : sub.isConfirmed ? (
                      <Badge tone="success">Потвърден</Badge>
                    ) : (
                      <Badge tone="warning">Чака потвърждение</Badge>
                    )}
                    {sub.syncedToMailerLite && <Badge tone="outline">MailerLite</Badge>}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </div>
  );
}
