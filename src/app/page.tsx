import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { ButtonLink, SectionHeading, Card } from "@/components/ui";
import { ProductCard, ProductGrid } from "@/components/product-card";
import { NewsletterForm } from "@/components/newsletter-form";
import { FileTextIcon, HeadphonesIcon } from "@/components/icons";
import { HeroBooks } from "@/components/book-3d";
import { productHref } from "@/components/product-card";
import { publicUrl } from "@/lib/storage";
import { IMAGES } from "@/lib/images";
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

export type HeroBook = {
  id: string;
  title: string;
  cover: string | null;
  href: string;
};

/** Ключовете, под които администраторът пази избраните книги. */
const HERO_KEYS = ["hero_book_1", "hero_book_2", "hero_book_3"] as const;

/**
 * Трите заглавия за hero ветрилото.
 *
 * Първо се гледа изборът от админ панела — по едно място за лявата, средната
 * и дясната книга. Празните места се допълват сами: препоръчани, после
 * най-продавани, после най-нови, и само с корица.
 *
 * Заглавие, което междувременно е скрито или изтрито, се пропуска — иначе
 * ветрилото щеше да зее или да води към несъществуваща страница.
 */
async function getHeroBooks(): Promise<HeroBook[]> {
  const select = {
    id: true,
    slug: true,
    title: true,
    type: true,
    coverImage: true,
  } as const;

  const settings = await db.setting.findMany({
    where: { key: { in: [...HERO_KEYS] } },
  });
  const chosenIds = HERO_KEYS.map(
    (k) => settings.find((s) => s.key === k)?.value?.trim() || null,
  );

  const picked = chosenIds.some(Boolean)
    ? await db.product.findMany({
        where: { id: { in: chosenIds.filter((x): x is string => Boolean(x)) }, isPublished: true },
        select,
      })
    : [];

  // Подредбата в панела определя коя книга къде застава, затова местата се
  // попълват по ключ, а не по реда, в който базата ги е върнала.
  const slots = chosenIds.map((id) => (id ? picked.find((p) => p.id === id) ?? null : null));

  const missing = slots.filter((x) => !x).length;
  if (missing > 0) {
    const taken = slots.filter(Boolean).map((p) => p!.id);
    const fill = await db.product.findMany({
      where: { isPublished: true, coverImage: { not: null }, id: { notIn: taken } },
      orderBy: [{ isFeatured: "desc" }, { isBestseller: "desc" }, { createdAt: "desc" }],
      take: missing,
      select,
    });
    for (let i = 0, f = 0; i < slots.length && f < fill.length; i++) {
      if (!slots[i]) slots[i] = fill[f++]!;
    }
  }

  return slots
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => ({
      id: p.id,
      title: p.title,
      cover: publicUrl(p.coverImage),
      href: productHref(p),
    }));
}

async function getAboutText(): Promise<string> {
  const setting = await db.setting.findUnique({ where: { key: "about_short" } });
  return (
    setting?.value ??
    "Remind Books започна с едно просто убеждение: правилната книга, срещната в правилния момент, може да върне посоката на цял един живот. Издаваме и подбираме заглавия за хора, които търсят своя вътрешен компас."
  );
}

export default async function HomePage() {
  const [bestsellers, pdfBooks, audioItems, posts, favoriteIds, aboutText, heroBooks] =
    await Promise.all([
      getBestsellers(4),
      getLatestByType("PDF", 4),
      getLatestByType("AUDIO", 3),
      getLatestPosts(3),
      getFavoriteIds(),
      getAboutText(),
      getHeroBooks(),
    ]);

  return (
    <>
      <Hero books={heroBooks} />

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
        <Card className="overflow-hidden bg-card border border-border">
          <div className="grid lg:grid-cols-[1.1fr_1fr]">
            <div className="p-8 sm:p-12">
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

            {/* На тесен екран снимката застава под текста и затова има своя
                височина; от lg нагоре се разтяга по височината на картата. */}
            <div className="relative min-h-56 sm:min-h-72 lg:min-h-full">
              <Image
                src={IMAGES.about}
                alt=""
                aria-hidden="true"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
            </div>
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
                  {/* Без корица публикацията показва обща снимка вместо празна
                      рамка с иконка — редицата остава равна. */}
                  <Image
                    src={post.coverImage ?? IMAGES.postFallback}
                    alt={post.coverImage ? post.title : ""}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
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

function Hero({ books }: { books: HeroBook[] }) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      {/* Стара библиотека зад заглавието, в пълния си цвят. Снимката е
          декорация, затова `alt` е празен — екранните четци няма какво да
          прочетат от нея. Единственото избелване по нея е сиянието под самото
          заглавие (`.hero-title` в globals.css), колкото буквите да се четат. */}
      <Image
        src={IMAGES.hero}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_38%]"
      />

      <div className="container-page relative z-10">
        <div className="max-w-2xl pt-12 pb-2 sm:pt-14 lg:pt-16">
          {/* `hero-title` носи сиянието, което държи буквите четими върху
              снимката — виж globals.css. */}
          <h1 className="hero-title text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
            Книги, които връщат посоката
          </h1>
        </div>
      </div>

      {/* Ветрилото стои в собствена лента под заглавието. Не се застъпва с него
          нарочно: докато текстът беше отгоре, прихващаше движението на мишката
          и книгите нито се повдигаха, нито се отваряха при щракване. */}
      {books.length > 0 && (
        <div className="relative z-10 pb-4">
          <HeroBooks books={books} />
        </div>
      )}
    </section>
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
