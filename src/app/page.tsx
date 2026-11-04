import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { ProductType } from "@prisma/client";

import { productHref } from "@/components/product-card";
import { HomeProvider } from "@/components/home/home-context";
import { HomeHero } from "@/components/home/hero";
import { HomeShelf } from "@/components/home/shelf";
import { PdfTeaser, type PdfFeature } from "@/components/home/pdf-teaser";
import { AudioCorner } from "@/components/home/audio-corner";
import { Values } from "@/components/home/values";
import type { HomeItem, Motif } from "@/components/home/shared";
import { publicUrl } from "@/lib/storage";
import { getSiteImages } from "@/lib/images";
import { getLatestPosts } from "@/lib/queries";
import { formatDate, stripHtml, truncate } from "@/lib/format";
import { PHASE_ORDER, type Phase } from "@/lib/daylight";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Remind Books — книги, които връщат посоката",
  description:
    "Физически и дигитални книги, аудио медитации и вдъхновяващо съдържание. Открийте своя вътрешен компас с Remind Books.",
  alternates: { canonical: "/" },
};

// Страницата е динамична: layout-ът чете cookie-та (кошница, сесия).
export const dynamic = "force-dynamic";

/** Колко заглавия от всеки вид стоят на рафта на началната страница. */
const PER_TYPE = 6;

/** Книгите, избрани в админ панела (Настройки → „Книги в горната секция“). */
const PICK_KEYS = ["hero_book_1", "hero_book_2", "hero_book_3"] as const;

const SELECT = {
  id: true,
  slug: true,
  type: true,
  title: true,
  author: true,
  description: true,
  shortDesc: true,
  priceCents: true,
  compareAtCents: true,
  coverImage: true,
  stock: true,
  isFree: true,
  isBestseller: true,
  durationSeconds: true,
  fileKey: true,
  previewKey: true,
} as const;

type Row = Awaited<ReturnType<typeof fetchType>>[number];

const MOTIFS_BY_TYPE: Record<ProductType, Motif[]> = {
  PHYSICAL: ["path", "letters", "compass", "sun"],
  PDF: ["arrow", "shards", "mirror", "waves"],
  AUDIO: ["sun", "moon", "waves", "compass"],
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function fetchType(type: ProductType) {
  return db.product.findMany({
    where: { type, isPublished: true },
    orderBy: [{ isFeatured: "desc" }, { isBestseller: "desc" }, { createdAt: "desc" }],
    take: PER_TYPE,
    select: SELECT,
  });
}

/** Абзаците на описанието като чист текст — за разлистващата се книжка. */
function paragraphsOf(description: string): string[] {
  const parts = /<p\b/i.test(description) ? description.split(/<\/p>/i) : description.split(/\n\s*\n/);
  return parts
    .map((p) => stripHtml(p))
    .filter((p) => p.length > 0)
    .map((p) => truncate(p, 230));
}

function toItem(p: Row): HomeItem {
  const h = hash(p.id);
  const motifs = MOTIFS_BY_TYPE[p.type];
  // Ключът към файла не излиза към браузъра — само адресът, през който се слуша.
  const audioSrc =
    p.type !== "AUDIO"
      ? null
      : p.isFree && p.fileKey
        ? `/api/audio/${p.id}`
        : p.previewKey
          ? `/api/preview/${p.id}`
          : null;

  return {
    id: p.id,
    slug: p.slug,
    type: p.type,
    title: p.title,
    author: p.author,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    cover: publicUrl(p.coverImage),
    stock: p.stock,
    isFree: p.isFree,
    isBestseller: p.isBestseller,
    durationSeconds: p.durationSeconds,
    blurb: p.shortDesc?.trim() || truncate(stripHtml(p.description), 260),
    href: productHref(p),
    audioSrc,
    hue: h % 360,
    motif: motifs[h % motifs.length]!,
  };
}

/**
 * Препоръките в началната секция — по три заглавия за всяка част от деня.
 * Сутрин: безплатна практика и леко четене; денем: PDF за действие; вечер:
 * аудио за забавяне; нощем: хартиена книга преди сън. Където липсва заглавие
 * от нужния вид, мястото се попълва с друго от рафта.
 */
function buildRecs(items: HomeItem[]): Record<Phase, string[]> {
  const P = items.filter((i) => i.type === "PHYSICAL");
  const D = items.filter((i) => i.type === "PDF");
  const A = items.filter((i) => i.type === "AUDIO");
  const freeAudio = A.find((a) => a.isFree) ?? A[0];

  const plan: Record<Phase, (HomeItem | undefined)[]> = {
    morn: [freeAudio, P[0], D[0]],
    day: [D[0], D[1], P[1]],
    eve: [A[1], A[0], D[2]],
    night: [P[0], D[1], A[2]],
  };

  const out = {} as Record<Phase, string[]>;
  for (const phase of PHASE_ORDER) {
    const ids: string[] = [];
    for (const it of plan[phase]) if (it && !ids.includes(it.id)) ids.push(it.id);
    for (const it of items) {
      if (ids.length >= 3) break;
      if (!ids.includes(it.id)) ids.push(it.id);
    }
    out[phase] = ids;
  }
  return out;
}

async function getHomeData() {
  const [physical, pdf, audio, picks] = await Promise.all([
    fetchType("PHYSICAL"),
    fetchType("PDF"),
    fetchType("AUDIO"),
    db.setting.findMany({ where: { key: { in: [...PICK_KEYS] } } }),
  ]);

  // Избраните от админ панела заглавия застават първи на своя рафт.
  const pickIds = PICK_KEYS.map((k) => picks.find((s) => s.key === k)?.value?.trim()).filter(Boolean);
  const pickedFirst = (rows: Row[]) =>
    [...rows].sort((a, b) => {
      const ia = pickIds.indexOf(a.id);
      const ib = pickIds.indexOf(b.id);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });

  const items = [...pickedFirst(physical), ...pickedFirst(pdf), ...pickedFirst(audio)].map(toItem);

  // Разлистващата се книжка: първото PDF заглавие с корица и описание.
  const featuredRow = pdf.find((p) => p.coverImage && p.description) ?? pdf[0];
  const feature: PdfFeature | null = featuredRow
    ? {
        item: items.find((i) => i.id === featuredRow.id)!,
        paragraphs: paragraphsOf(featuredRow.description),
        quote: featuredRow.shortDesc?.trim() ? truncate(featuredRow.shortDesc.trim(), 180) : null,
      }
    : null;

  return { items, feature, recIds: buildRecs(items) };
}

async function getAboutText(): Promise<string> {
  const setting = await db.setting.findUnique({ where: { key: "about_short" } });
  return (
    setting?.value ??
    "Remind Books започна с едно просто убеждение: правилната книга, срещната в правилния момент, може да върне посоката на цял един живот."
  );
}

export default async function HomePage() {
  const [{ items, feature, recIds }, posts, aboutText, images] = await Promise.all([
    getHomeData(),
    getLatestPosts(3),
    getAboutText(),
    getSiteImages(),
  ]);

  const tracks = items.filter((i) => i.type === "AUDIO");

  return (
    <div className="rb-home">
      <HomeProvider items={items} recIds={recIds}>
        <div className="container-page rb-top" id="top">
          <HomeHero />
        </div>

        {items.length > 0 && (
          <section id="shelf">
            <div className="container-page">
              <HomeShelf />
            </div>
          </section>
        )}

        <section id="pdf" style={{ paddingTop: items.length ? 0 : undefined }}>
          <div className="container-page">
            <PdfTeaser feature={feature} />
          </div>
        </section>

        {tracks.length > 0 && (
          <section id="audio" style={{ paddingTop: 0 }}>
            <div className="container-page">
              <AudioCorner tracks={tracks} />
            </div>
          </section>
        )}
      </HomeProvider>

      <section id="about" style={{ paddingTop: 0 }}>
        <div className="container-page">
          <div className="about">
            <Image src={images.about} alt="" aria-hidden="true" fill sizes="(max-width: 1240px) 100vw, 1240px" />
            <div className="about-in">
              <div className="card glass">
                <div className="rb-label">За нас</div>
                <h2 className="rb-sec" style={{ fontSize: "clamp(30px,3.6vw,44px)" }}>
                  Историята зад Remind Books
                </h2>
                <p>{aboutText}</p>
                <Link className="btn ghost" href="/za-nas" style={{ marginTop: 6 }}>
                  Прочети повече
                </Link>
              </div>
              <Values />
            </div>
          </div>
        </div>
      </section>

      {posts.length > 0 && (
        <section id="blog" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div className="container-page">
            <div className="shelf-head">
              <div>
                <div className="rb-label">Блог „Вътрешен компас“</div>
                <h2 className="rb-sec">От блога</h2>
              </div>
              <Link className="btn ghost" href="/blog">
                Всички публикации
              </Link>
            </div>
            <div className="posts">
              {posts.map((post) => (
                <Link key={post.id} className="post glass" href={`/blog/${post.slug}`}>
                  <div className="phot">
                    <Image
                      src={post.coverImage ?? images.postFallback}
                      alt=""
                      fill
                      sizes="(max-width: 980px) 100vw, 33vw"
                    />
                  </div>
                  <div className="tx">
                    {post.publishedAt && (
                      <time dateTime={post.publishedAt.toISOString()}>{formatDate(post.publishedAt)}</time>
                    )}
                    <h3>{post.title}</h3>
                    {post.excerpt && <p>{truncate(post.excerpt, 140)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
