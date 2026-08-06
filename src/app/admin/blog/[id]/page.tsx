import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { AdminHeader } from "@/components/admin/admin-ui";
import { PostForm } from "@/components/admin/post-form";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Редакция на публикация",
  robots: { index: false, follow: false },
};

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const post = await db.post.findUnique({
    where: { id },
    include: { tags: { select: { name: true } } },
  });

  if (!post) notFound();

  return (
    <div>
      <AdminHeader
        title="Редакция на публикация"
        description={post.title}
        action={
          post.isPublished ? (
            <ButtonLink href={`/blog/${post.slug}`} target="_blank" variant="outline">
              Виж в сайта ↗
            </ButtonLink>
          ) : undefined
        }
      />

      <PostForm
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt ?? "",
          body: post.body,
          isPublished: post.isPublished,
          metaTitle: post.metaTitle ?? "",
          metaDescription: post.metaDescription ?? "",
          coverUrl: publicUrl(post.coverImage),
          tags: post.tags.map((t) => t.name).join(", "),
        }}
      />
    </div>
  );
}
