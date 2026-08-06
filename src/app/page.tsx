import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ButtonLink, SectionHeading, Card } from "@/components/ui";
import { ProductCard, ProductGrid } from "@/components/product-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { BookIcon, FileTextIcon, HeadphonesIcon } from "@/components/icons";
import { HeroVideo } from "@/components/hero-video";
import { publicUrl } from "@/lib/storage";
import {
  getBestsellers,
  getLatestByType,
  getLatestPosts,
} from "@/lib/queries";
import { getFavoriteIds } from "@/app/actions/favorites";
import { formatDate, truncate } from "@/lib/format";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "ReMindBooks — книги, които връщат посоката",
  description:
    "Физически и дигитални книги, аудио медитации и вдъхновяващо съдържание. Открийте своя вътрешен компас с ReMindBooks.",
  alternates: { canonical: "/" },
};

// Страницата е динамична: layout-ът чете cookie-та (кошница, сесия), а
// секцията с любими зависи от текущия потребител.
export const dynamic = "force-dynamic";

/** Декоративното видео за hero секцията, ако собственикът е качил такова. */
async function getHeroVideo() {
  const rows = await db.setting.findMany({
    where: { key: { in: ["hero_video", "hero_video_poster"] } },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const src = publicUrl(map.hero_video || null);
  return src ? { src, poster: publicUrl(map.hero_video_poster || null) } : null;
}

async function getAboutText(): Promise<string> {
  const setting = await db.setting.findUnique({ where: { key: "about_short" } });
  return (
    setting?.value ??
    "ReMindBooks започна с едно просто убеждение: правилната книга, срещната в правилния момент, може да върне посоката на цял един живот. Издаваме и подбираме заглавия за хора, които търсят своя вътрешен компас."
  );
}

export default async function HomePage() {
  const [bestsellers, pdfBooks, audioItems, posts, favoriteIds, aboutText, heroVideo] =
    await Promise.all([
      getBestsellers(4),
      getLatestByType("PDF", 4),
      getLatestByType("AUDIO", 3),
      getLatestPosts(3),
      getFavoriteIds(),
      getAboutText(),
      getHeroVideo(),
    ]);

  return (
    <>
      <Hero video={heroVideo} />

      {/* Най-продавани физически книги */}
      {bestsellers.length > 0 && (
        <section className="container-page py-16" aria-labelledby="bestsellers">
          <SectionHeading title="Най-продавани" href="/knigi" />
          <ProductGrid>
            {bestsellers.map((p, i) => (
              <ProductCard
                key={p.id}
                product={p}
                isFavorite={favoriteIds.has(p.id)}
                priority={i < 2}
              />
            ))}
          </ProductGrid>
        </section>
      )}

      {/* Промо секция PDF книги */}
      <PromoSection
        eyebrow="Дигитални издания"
        title="PDF книги — четете веднага"
        description="Без чакане и без доставка. Плащате с карта и книгата се отключва в профила ви за секунди. Всяко заглавие има безплатен откъс, за да прелистите преди да решите."
        href="/pdf"
        linkLabel="Разгледай PDF книгите"
        icon={<FileTextIcon size={28} />}
        products={pdfBooks}
        favoriteIds={favoriteIds}
      />

      {/* Промо секция аудио */}
      <PromoSection
        eyebrow="За слушане"
        title="Аудио медитации и четения"
        description="Записи, които можете да слушате навсякъде — сутрешни практики, водени медитации и авторски четения. Част от съдържанието е напълно безплатно."
        href="/audio"
        linkLabel="Към аудио съдържанието"
        icon={<HeadphonesIcon size={28} />}
        products={audioItems}
        favoriteIds={favoriteIds}
        reversed
      />

      {/* Кратко "За нас" */}
      <section className="container-page py-16" aria-labelledby="about-teaser">
        <Card className="p-8 sm:p-12 bg-muted border-0">
          <div className="max-w-3xl">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-primary">
              За нас
            </p>
            <h2 id="about-teaser" className="mt-3 text-2xl sm:text-3xl">
              Историята зад ReMindBooks
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed text-lg">
              {aboutText}
            </p>
            <ButtonLink href="/za-nas" variant="outline" className="mt-6">
              Прочети повече
            </ButtonLink>
          </div>
        </Card>
      </section>

      {/* От блога */}
      {posts.length > 0 && (
        <section className="container-page py-16" aria-labelledby="from-blog">
          <SectionHeading title="От блога" href="/blog" linkLabel="Всички публикации" />
          <div className="grid gap-8 md:grid-cols-3">
            {posts.map((post) => (
              <article key={post.id} className="group flex flex-col">
                <Link
                  href={`/blog/${post.slug}`}
                  className="block relative aspect-[3/2] bg-muted rounded-md overflow-hidden border border-border"
                >
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                      <BookIcon size={32} />
                    </div>
                  )}
                </Link>

                <time
                  dateTime={post.publishedAt?.toISOString()}
                  className="mt-4 font-sans text-xs uppercase tracking-wider text-muted-foreground"
                >
                  {post.publishedAt ? formatDate(post.publishedAt) : ""}
                </time>

                <h3 className="mt-2 text-lg leading-snug">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {post.title}
                  </Link>
                </h3>

                {post.excerpt && (
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed line-clamp-3">
                    {truncate(post.excerpt, 140)}
                  </p>
                )}

                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-3 font-sans text-sm font-bold text-primary hover:underline underline-offset-4 self-start"
                >
                  Прочети →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Бюлетин */}
      <section className="container-page pb-20" aria-labelledby="newsletter">
        <Card className="p-8 sm:p-12 text-center bg-card">
          <h2 id="newsletter" className="text-2xl sm:text-3xl">
            Останете свързани
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Нови заглавия, откъси и мисли от блога — веднъж месечно, право във
            вашата поща.
          </p>
          <div className="mt-6 max-w-md mx-auto text-left">
            <NewsletterForm source="homepage" />
          </div>
        </Card>
      </section>
    </>
  );
}

function Hero({
  video,
}: {
  video: { src: string; poster: string | null } | null;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Фонова текстура от градиенти — без външни изображения, зарежда се мигновено */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, var(--accent) 0%, transparent 45%), radial-gradient(circle at 85% 70%, var(--secondary) 0%, transparent 50%)",
        }}
      />

      <div className="container-page relative py-20 sm:py-28 lg:py-32">
        <div
          className={
            video
              ? "grid lg:grid-cols-[1.15fr_1fr] gap-12 lg:gap-16 items-center"
              : ""
          }
        >
        <div className={video ? "" : "max-w-3xl"}>
          <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary">
            ReMindBooks
          </p>

          <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl leading-[1.1]">
            Книги, които връщат посоката
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground leading-relaxed max-w-2xl">
            Хартиени издания, дигитални книги и аудио практики за всеки, който
            търси своя вътрешен компас.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink href="/knigi" size="lg">
              Разгледай книгите
            </ButtonLink>
            <ButtonLink href="/audio" variant="outline" size="lg">
              Чуй откъс
            </ButtonLink>
          </div>

          {/* Трите категории като бърза навигация */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <QuickLink href="/knigi" icon={<BookIcon size={20} />} label="Физически книги" />
            <QuickLink href="/pdf" icon={<FileTextIcon size={20} />} label="PDF книги" />
            <QuickLink href="/audio" icon={<HeadphonesIcon size={20} />} label="Аудио" />
          </div>
        </div>

        {video && (
          <div className="lg:pl-4">
            <HeroVideo src={video.src} poster={video.poster} />
          </div>
        )}
        </div>
      </div>
    </section>
  );
}

function QuickLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-sm border border-border rounded-md hover:border-primary hover:text-primary transition-colors group"
    >
      <span className="text-primary">{icon}</span>
      <span className="font-sans text-sm font-bold">{label}</span>
      <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
        →
      </span>
    </Link>
  );
}

function PromoSection({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  icon,
  products,
  favoriteIds,
  reversed = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  icon: React.ReactNode;
  products: Awaited<ReturnType<typeof getLatestByType>>;
  favoriteIds: Set<string>;
  reversed?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section className="container-page py-16">
      <div
        className={`grid lg:grid-cols-3 gap-10 items-start ${
          reversed ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div className="lg:sticky lg:top-24">
          <span className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-primary/12 text-primary">
            {icon}
          </span>
          <p className="mt-4 font-sans text-xs font-bold uppercase tracking-[0.15em] text-primary">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl">{title}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{description}</p>
          <ButtonLink href={href} variant="outline" className="mt-6">
            {linkLabel}
          </ButtonLink>
        </div>

        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-9">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                isFavorite={favoriteIds.has(p.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
