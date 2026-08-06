import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { LEGAL_META } from "@/lib/legal-content";

export const dynamic = "force-dynamic";

/**
 * Карта на сайта за търсачките.
 * Включва статичните страници, всички публикувани продукти и блог публикации.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.appUrl;

  const staticPages: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/knigi`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/pdf`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/audio`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/za-nas`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/kontakti`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/podaruchni-karti`, changeFrequency: "monthly", priority: 0.5 },
    ...Object.values(LEGAL_META).map((page) => ({
      url: `${base}/${page.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  try {
    const [products, posts] = await Promise.all([
      db.product.findMany({
        where: { isPublished: true },
        select: { slug: true, type: true, updatedAt: true },
      }),
      db.post.findMany({
        where: { isPublished: true, publishedAt: { lte: new Date() } },
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const productPages: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${base}/${p.type === "PHYSICAL" ? "knigi" : p.type === "PDF" ? "pdf" : "audio"}/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const postPages: MetadataRoute.Sitemap = posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly",
      priority: 0.7,
    }));

    return [...staticPages, ...productPages, ...postPages];
  } catch {
    // Ако базата е недостъпна, статичната част пак е валидна карта.
    return staticPages;
  }
}
