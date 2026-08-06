import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { formatDate } from "@/lib/format";
import {
  AdminHeader,
  AdminTable,
  Th,
  Td,
  AdminEmpty,
  AdminTabs,
} from "@/components/admin/admin-ui";
import { PostRowActions } from "@/components/admin/post-row-actions";
import { Badge, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Блог",
  robots: { index: false, follow: false },
};

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const filter = params.status ?? "all";

  const where =
    filter === "published"
      ? { isPublished: true }
      : filter === "draft"
        ? { isPublished: false }
        : {};

  const [posts, publishedCount, draftCount] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true, slug: true, title: true, coverImage: true,
        isPublished: true, publishedAt: true, updatedAt: true,
        tags: { select: { name: true } },
        _count: { select: { comments: true } },
      },
    }),
    db.post.count({ where: { isPublished: true } }),
    db.post.count({ where: { isPublished: false } }),
  ]);

  return (
    <div>
      <AdminHeader
        title="Блог „Вътрешен компас“"
        description="Създаване и управление на публикациите."
        action={<ButtonLink href="/admin/blog/nova">Нова публикация</ButtonLink>}
      />

      <AdminTabs
        basePath="/admin/blog"
        current={filter}
        tabs={[
          { key: "all", label: "Всички" },
          { key: "published", label: "Публикувани", count: publishedCount },
          { key: "draft", label: "Чернови", count: draftCount },
        ]}
      />

      {posts.length === 0 ? (
        <AdminEmpty
          title="Още няма публикации"
          description="Първата статия ще се появи в блога и на началната страница."
          action={<ButtonLink href="/admin/blog/nova">Нова публикация</ButtonLink>}
        />
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <Th className="w-20" />
              <Th>Заглавие</Th>
              <Th>Тагове</Th>
              <Th>Дата</Th>
              <Th>Статус</Th>
              <Th className="text-right">Действия</Th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const cover = publicUrl(post.coverImage);
              return (
                <tr key={post.id} className="hover:bg-muted/50 transition-colors">
                  <Td>
                    <div className="relative w-16 h-11 bg-muted rounded-sm overflow-hidden border border-border">
                      {cover && (
                        <Image src={cover} alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                  </Td>

                  <Td>
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="font-sans font-bold hover:text-primary transition-colors line-clamp-2"
                    >
                      {post.title}
                    </Link>
                    {post._count.comments > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {post._count.comments}{" "}
                        {post._count.comments === 1 ? "коментар" : "коментара"}
                      </p>
                    )}
                  </Td>

                  <Td>
                    <div className="flex flex-wrap gap-1">
                      {post.tags.slice(0, 3).map((t) => (
                        <Badge key={t.name} tone="outline">
                          {t.name}
                        </Badge>
                      ))}
                    </div>
                  </Td>

                  <Td className="whitespace-nowrap text-xs text-muted-foreground">
                    {post.publishedAt
                      ? formatDate(post.publishedAt)
                      : `Редактирана ${formatDate(post.updatedAt)}`}
                  </Td>

                  <Td>
                    {post.isPublished ? (
                      <Badge tone="success">Публикувана</Badge>
                    ) : (
                      <Badge tone="default">Чернова</Badge>
                    )}
                  </Td>

                  <Td className="text-right">
                    <PostRowActions
                      postId={post.id}
                      slug={post.slug}
                      isPublished={post.isPublished}
                    />
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
