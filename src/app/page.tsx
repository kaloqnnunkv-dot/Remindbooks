import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ButtonLink, SectionHeading, Card } from "@/components/ui";
import { ProductCard, ProductGrid } from "@/components/product-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { BookIcon, FileTextIcon, HeadphonesIcon } from "@/components/icons";
import { HeroMarquee, type MarqueeProduct } from "@/components/hero-marquee";
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
  title: "Remind Books — книги, които връщат посоката",
  description:
    "Физически и дигитални книги, аудио медитации и вдъхновяващо съдържание. Открийте своя вътрешен компас с Remind Books.",
  alternates: { canonical: "/" },
};

// Страницата е динамична: layout-ът чете cookie-та (кошница, сесия), а
// секцията с любими зависи от текущия потребител.
export const dynamic = "force-dynamic";

/** Всички публикувани заглавия — те се въртят по кривата в hero секцията. */
async function getMarqueeProducts(): Promise<MarqueeProduct[]> {
  const rows = await db.product.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { id: true, slug: true, title: true, type: true, coverImage: true },
  });
  return rows.map((r) => ({ ...r, coverImage: publicUrl(r.coverImage) }));
}

async function getAboutText(): Promise<string> {
  const setting = await db.setting.findUnique({ where: { key: "about_short" } });
  return (
    setting?.value ??
    "Remind Books започна с едно просто убеждение: правилната книга, срещната в правилния момент, може да върне посоката на цял един живот. Издаваме и подбираме заглавия за хора, които търсят своя вътрешен компас."
  );
}

export default async function HomePage() {
  const [bestsellers, pdfBooks, audioItems, posts, favoriteIds, aboutText, marqueeProducts] =
    await Promise.all([
      getBestsellers(4),
      getLatestByType("PDF", 4),
      getLatestByType("AUDIO", 3),
      getLatestPosts(3),
      getFavoriteIds(),
      getAboutText(),
      getMarqueeProducts(),
    ]);

  return (
    <>
      <Hero products={marqueeProducts} />

      {/* Най-продавани физически книги */}
      {bestsellers.length > 0 && (
        <section className="section-alt border-b border-border" aria-labelledby="bestsellers">
          <div className="container-page py-16">
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
          </div>
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
        tone="alt"
      />

      {/* Кратко "За нас" */}
      <section className="section-alt-strong border-b border-border" aria-labelledby="about-teaser">
        <div className="container-page py-16">
        <Card className="p-8 sm:p-12 bg-card border border-border">
          <div className="max-w-3xl">
            <p className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-primary">
              За нас
            </p>
            <h2 id="about-teaser" className="mt-3 text-2xl sm:text-3xl">
              Историята зад Remind Books
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed text-lg">
              {aboutText}
            </p>
            <ButtonLink href="/za-nas" variant="outline" className="mt-6">
              Прочети повече
            </ButtonLink>
          </div>
        </Card>
        </div>
      </section>

      {/* От блога */}
      {posts.length > 0 && (
        <section className="border-b border-border" aria-labelledby="from-blog">
          <div className="container-page py-16">
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
          </div>
        </section>
      )}

      {/* Бюлетин */}
      <section className="section-alt-strong" aria-labelledby="newsletter">
        <div className="container-page py-16">
        <Card className="p-8 sm:p-12 text-center bg-card border border-border">
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
        </div>
      </section>
    </>
  );
}

function Hero({ products }: { products: MarqueeProduct[] }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Мека текстура от градиенти — зарежда се мигновено, без изображения */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 15% 20%, var(--accent) 0%, transparent 45%), radial-gradient(circle at 85% 70%, var(--secondary) 0%, transparent 50%)",
        }}
      />

      {/* Кориците се движат по крива, която заобикаля горния ляв ъгъл */}
      <div className="absolute inset-0 hidden sm:block">
        <HeroMarquee products={products} />
      </div>

      <div className="container-page relative">
        <div className="relative z-10 max-w-2xl py-20 sm:py-28 lg:py-32">
          {/* Мек ореол зад текста — кориците минават встрани, но при тесни
              екрани може да се доближат, а заглавието трябва да остане четимо. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-8 -inset-y-6 -z-10"
            style={{
              background:
                "radial-gradient(60% 55% at 30% 45%, var(--background) 55%, transparent 100%)",
            }}
          />

          <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary">
            Remind Books
          </p>

          <h1 className="mt-5 text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
            Книги, които връщат посоката
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
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

          <div className="mt-14 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
            <QuickLink href="/knigi" icon={<BookIcon size={20} />} label="Физически книги" />
            <QuickLink href="/pdf" icon={<FileTextIcon size={20} />} label="PDF книги" />
            <QuickLink href="/audio" icon={<HeadphonesIcon size={20} />} label="Аудио" />
          </div>
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
  tone = "plain",
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
  /** Редуването на фонове прави границите между секциите видими. */
  tone?: "plain" | "alt";
}) {
  if (products.length === 0) return null;

  return (
    <section
      className={
        tone === "alt" ? "section-alt border-b border-border" : "border-b border-border"
      }
    >
      <div className="container-page py-16">
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5">
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
      </div>
    </section>
  );
}
