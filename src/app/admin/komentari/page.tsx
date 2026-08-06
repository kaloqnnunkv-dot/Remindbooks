import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { AdminHeader, AdminEmpty, AdminTabs } from "@/components/admin/admin-ui";
import { CommentActions } from "@/components/admin/comment-actions";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Коментари",
  robots: { index: false, follow: false },
};

export default async function AdminCommentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status ?? "pending";

  const where =
    filter === "pending"
      ? { isApproved: false }
      : filter === "approved"
        ? { isApproved: true }
        : {};

  const [comments, pendingCount, approvedCount] = await Promise.all([
    db.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { post: { select: { title: true, slug: true } } },
    }),
    db.comment.count({ where: { isApproved: false } }),
    db.comment.count({ where: { isApproved: true } }),
  ]);

  return (
    <div>
      <AdminHeader
        title="Коментари в блога"
        description="Коментарите се публикуват едва след вашето одобрение — така спамът не достига до сайта."
      />

      <AdminTabs
        basePath="/admin/komentari"
        current={filter}
        tabs={[
          { key: "pending", label: "Чакащи", count: pendingCount },
          { key: "approved", label: "Одобрени", count: approvedCount },
          { key: "all", label: "Всички", count: pendingCount + approvedCount },
        ]}
      />

      {comments.length === 0 ? (
        <AdminEmpty
          title={filter === "pending" ? "Няма чакащи коментари" : "Няма коментари"}
          description={
            filter === "pending"
              ? "Всички коментари са прегледани."
              : "Коментарите от блога ще се появяват тук."
          }
        />
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <Card
              key={comment.id}
              className={comment.isApproved ? "p-5" : "p-5 border-warning/50"}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-sans font-bold">{comment.authorName}</span>
                    {comment.isApproved ? (
                      <Badge tone="success">Одобрен</Badge>
                    ) : (
                      <Badge tone="warning">Чака одобрение</Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground break-all">
                    {comment.authorEmail}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(comment.createdAt)} · под{" "}
                    <Link
                      href={`/blog/${comment.post.slug}`}
                      target="_blank"
                      className="text-primary hover:underline"
                    >
                      {comment.post.title}
                    </Link>
                  </p>
                </div>

                <CommentActions
                  commentId={comment.id}
                  isApproved={comment.isApproved}
                />
              </div>

              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {comment.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
