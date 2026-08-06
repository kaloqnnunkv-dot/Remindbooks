import type { Metadata } from "next";

import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, AdminEmpty, AdminTabs } from "@/components/admin/admin-ui";
import { MessageActions } from "@/components/admin/message-actions";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Съобщения",
  robots: { index: false, follow: false },
};

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status ?? "unread";

  const where =
    filter === "unread" ? { isRead: false } : filter === "read" ? { isRead: true } : {};

  const [messages, unreadCount, totalCount] = await Promise.all([
    db.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.contactMessage.count({ where: { isRead: false } }),
    db.contactMessage.count(),
  ]);

  return (
    <div>
      <AdminHeader
        title="Съобщения от формата за контакт"
        description="Всички съобщения се препращат и на имейла ви, но се пазят и тук."
      />

      <AdminTabs
        basePath="/admin/sabshtenia"
        current={filter}
        tabs={[
          { key: "unread", label: "Непрочетени", count: unreadCount },
          { key: "read", label: "Прочетени", count: totalCount - unreadCount },
          { key: "all", label: "Всички", count: totalCount },
        ]}
      />

      {messages.length === 0 ? (
        <AdminEmpty
          title={filter === "unread" ? "Няма непрочетени съобщения" : "Няма съобщения"}
          description={
            filter === "unread"
              ? "Всички съобщения са прегледани."
              : "Съобщенията от формата за контакт ще се появяват тук."
          }
        />
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <Card
              key={message.id}
              className={message.isRead ? "p-5" : "p-5 border-primary/50"}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans font-bold">{message.name}</span>
                    {!message.isRead && <Badge tone="primary">Ново</Badge>}
                  </div>

                  <a
                    href={`mailto:${message.email}?subject=${encodeURIComponent(
                      `Re: ${message.subject ?? "Вашето съобщение до ReMindBooks"}`,
                    )}`}
                    className="text-sm text-primary hover:underline break-all"
                  >
                    {message.email}
                  </a>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(message.createdAt)}
                  </p>
                </div>

                <MessageActions messageId={message.id} isRead={message.isRead} />
              </div>

              {message.subject && (
                <p className="mt-3 font-sans text-sm font-bold">{message.subject}</p>
              )}

              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {message.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
