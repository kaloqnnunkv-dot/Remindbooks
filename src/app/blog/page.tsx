import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { formatDate, truncate, stripHtml } from "@/lib/format";

import { PageBanner, EmptyState, ButtonLink, cn } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { BookIcon } from "@/components/icons";
import { getSiteImages } from "@/lib/images";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вътрешен компас — блог",
  description:
    "Статии, вдъхновения и практики от Remind Books. Блогът „Вътрешен компас“ — за посоката, която търсим отвътре.",
  alternates: { canonical: "/blog" },
  openGraph: {
    type: "website",
    title: "Вътрешен компас — блогът на Remind Books",
    description: "Статии, вдъхновения и практики от Remind Books.",
  },
};

const PER_PAGE = 9;

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ stranica?: string; tag?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.stranica) || 1);

  const where = {
    isPublished: true,
    publishedAt: { lte: new Date() },
    ...(params.tag ? { tags: { some: { slug: params.tag } } } : {}),
  };

  const [posts, total, tags, images] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, slug: true, title: true, excerpt: true, body: true,
        coverImage: true, publishedAt: true,
        tags: { select: { name: true, slug: true } },
      },
    }),
    db.post.count({ where }),
    db.tag.findMany({
      where: { posts: { some: { isPublished: true } } },
      select: {
        id: true, name: true, slug: true,
        _count: { select: { posts: { where: { isPublished: true } } } },
      },
      orderBy: { name: "asc" },
    }),
    getSiteImages(),
  ]);

  const pages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div className="container-page py-12">
      <PageBanner
        image={images.blog}
        title="Вътрешен компас"
        description="Мисли, практики и истории за хората, които търсят своята посока."
      />

      {/* Тагове */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          <Link
            href="/blog"
            className={cn(
              "px-3.5 py-1.5 rounded-md border font-sans text-xs font-bold transition-colors",
              !params.tag
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary hover:text-primary",
            )}
          >
            Всички
          </Link>
          {tags.map((tag) => (
            <Link
              key={tag.id}
              href={`/blog?tag=${tag.slug}`}
              className={cn(
                "px-3.5 py-1.5 rounded-md border font-sans text-xs font-bold transition-colors",
                params.tag === tag.slug
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border hover:border-primary hover:text-primary",
              )}
            >
              {tag.name}
              <span className="ml-1.5 opacity-60">{tag._count.posts}</span>
            </Link>
          ))}
        </div>
      )}

      {posts.length === 0 ? (
        <EmptyState
          icon={<BookIcon size={40} />}
          title="Още няма публикации"
          description={
            params.tag
              ? "Няма публикации с този таг."
              : "Скоро тук ще споделим първите си мисли."
          }
          action={
            params.tag ? (
              <ButtonLink href="/blog" variant="outline">
                Всички публикации
              </ButtonLink>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, i) => {
              const cover = publicUrl(post.coverImage);
              // Ако авторът не е попълнил резюме, генерираме го от текста.
              const excerpt =
                post.excerpt ?? truncate(stripHtml(post.body), 150);

              return (
                <article key={post.id} className="group flex flex-col">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="block relative aspect-[3/2] bg-muted rounded-md overflow-hidden border border-border"
                  >
                    {/* Публикация без корица показва обща снимка вместо празна
                        рамка с иконка — редицата остава равна. */}
                    <Image
                      src={cover ?? images.postFallback}
                      alt={cover ? post.title : ""}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      priority={i < 3}
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </Link>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {post.publishedAt && (
                      <time
                        dateTime={post.publishedAt.toISOString()}
                        className="font-sans text-xs uppercase tracking-wider text-muted-foreground"
                      >
                        {formatDate(post.publishedAt)}
                      </time>
                    )}
                    {post.tags.slice(0, 2).map((t) => (
                      <Link
                        key={t.slug}
                        href={`/blog?tag=${t.slug}`}
                        className="font-sans text-xs text-primary hover:underline underline-offset-2"
                      >
                        #{t.name}
                      </Link>
                    ))}
                  </div>

                  <h2 className="mt-2 text-xl leading-snug">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-primary transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {excerpt}
                  </p>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-3 font-sans text-sm font-bold text-primary hover:underline underline-offset-4 self-start"
                  >
                    Прочети →
                  </Link>
                </article>
              );
            })}
          </div>

          <Pagination page={page} pages={pages} basePath="/blog" searchParams={params} />
        </>
      )}
    </div>
  );
}
