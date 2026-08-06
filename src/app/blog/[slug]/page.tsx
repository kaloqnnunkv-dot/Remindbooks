import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { publicUrl } from "@/lib/storage";
import { formatDate, truncate, stripHtml } from "@/lib/format";

import { Breadcrumbs, SectionHeading } from "@/components/ui";
import { ShareButtons } from "@/components/share-buttons";
import { CommentSection } from "@/components/comments";
import { BookIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

async function getPost(slug: string) {
  return db.post.findFirst({
    where: { slug, isPublished: true, publishedAt: { lte: new Date() } },
    include: { tags: { select: { name: true, slug: true } } },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Публикацията не е намерена" };

  // Ако авторът не е попълнил мета описание, генерираме го автоматично —
  // изискване на спецификацията за SEO.
  const description =
    post.metaDescription ??
    post.excerpt ??
    truncate(stripHtml(post.body), 155);
  const cover = publicUrl(post.coverImage);

  return {
    title: post.metaTitle ?? post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.metaTitle ?? post.title,
      description,
      url: `${env.appUrl}/blog/${post.slug}`,
      publishedTime: post.publishedAt?.toISOString(),
      images: cover ? [{ url: cover, alt: post.title }] : undefined,
      tags: post.tags.map((t) => t.name),
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const [comments, related] = await Promise.all([
    env.features.comments
      ? db.comment.findMany({
          where: { postId: post.id, isApproved: true },
          orderBy: { createdAt: "asc" },
          select: { id: true, authorName: true, body: true, createdAt: true },
        })
      : Promise.resolve([]),
    db.post.findMany({
      where: {
        isPublished: true,
        id: { not: post.id },
        ...(post.tags.length > 0
          ? { tags: { some: { slug: { in: post.tags.map((t) => t.slug) } } } }
          : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: {
        id: true, slug: true, title: true, excerpt: true,
        coverImage: true, publishedAt: true,
      },
    }),
  ]);

  const cover = publicUrl(post.coverImage);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? truncate(stripHtml(post.body), 200),
    image: cover ?? undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { "@type": "Organization", name: "ReMindBooks" },
    publisher: { "@type": "Organization", name: "ReMindBooks" },
    mainEntityOfPage: `${env.appUrl}/blog/${post.slug}`,
  };

  return (
    <div className="container-page py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="max-w-3xl mx-auto">
        <Breadcrumbs
          items={[
            { label: "Начало", href: "/" },
            { label: "Блог", href: "/blog" },
            { label: post.title },
          ]}
        />

        <header>
          <div className="flex flex-wrap items-center gap-3">
            {post.publishedAt && (
              <time
                dateTime={post.publishedAt.toISOString()}
                className="font-sans text-xs uppercase tracking-wider text-muted-foreground"
              >
                {formatDate(post.publishedAt)}
              </time>
            )}
            {post.tags.map((t) => (
              <Link
                key={t.slug}
                href={`/blog?tag=${t.slug}`}
                className="font-sans text-xs text-primary hover:underline underline-offset-2"
              >
                #{t.name}
              </Link>
            ))}
          </div>

          <h1 className="mt-3 text-3xl sm:text-4xl lg:text-[2.75rem] leading-[1.15]">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </header>

        {cover && (
          <div className="relative aspect-[16/9] mt-8 bg-muted rounded-md overflow-hidden border border-border">
            <Image
              src={cover}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              priority
              className="object-cover"
            />
          </div>
        )}

        <div
          className="prose-rmb mt-10 text-[17px]"
          dangerouslySetInnerHTML={{ __html: post.body }}
        />

        <ShareButtons
          path={`/blog/${post.slug}`}
          title={post.title}
          className="mt-10 pt-6 border-t border-border"
        />

        {env.features.comments && (
          <CommentSection postId={post.id} comments={comments} />
        )}
      </article>

      {related.length > 0 && (
        <section className="mt-20 pt-12 border-t border-border max-w-5xl mx-auto">
          <SectionHeading title="Още от блога" href="/blog" linkLabel="Всички" />
          <div className="grid gap-8 md:grid-cols-3">
            {related.map((r) => {
              const rCover = publicUrl(r.coverImage);
              return (
                <article key={r.id} className="group">
                  <Link
                    href={`/blog/${r.slug}`}
                    className="block relative aspect-[3/2] bg-muted rounded-md overflow-hidden border border-border"
                  >
                    {rCover ? (
                      <Image
                        src={rCover}
                        alt={r.title}
                        fill
                        sizes="33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        <BookIcon size={28} />
                      </div>
                    )}
                  </Link>
                  <h3 className="mt-3 font-sans text-sm font-bold leading-snug">
                    <Link
                      href={`/blog/${r.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {r.title}
                    </Link>
                  </h3>
                  {r.publishedAt && (
                    <time
                      dateTime={r.publishedAt.toISOString()}
                      className="mt-1 block text-xs text-muted-foreground"
                    >
                      {formatDate(r.publishedAt)}
                    </time>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
