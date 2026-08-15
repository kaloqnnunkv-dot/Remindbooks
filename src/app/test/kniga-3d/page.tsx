import type { Metadata } from "next";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { BookLab, BookRow } from "@/components/test/book-3d";

export const dynamic = "force-dynamic";

/**
 * Изпитателна страница за анимацията на книгата.
 *
 * Нарочно не е свързана с нищо и не се индексира — служи само за преценка на
 * усещането, преди нещо от това да влезе в сайта.
 */
export const metadata: Metadata = {
  title: "Проба: книга в 3D",
  robots: { index: false, follow: false },
};

async function getBooks() {
  const rows = await db.product.findMany({
    where: { isPublished: true, coverImage: { not: null } },
    orderBy: { createdAt: "asc" },
    take: 4,
    select: { id: true, title: true, coverImage: true },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    cover: publicUrl(r.coverImage),
  }));
}

export default async function Book3DTestPage() {
  const books = await getBooks();
  const main = books[0];

  return (
    <div className="container-page space-y-16 py-14">
      <header className="max-w-2xl">
        <p className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-primary">
          Проба — не е част от сайта
        </p>
        <h1 className="mt-4 text-3xl sm:text-4xl">Книга в 3D</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Направено само с CSS 3D — без Three.js, без модели и без нови файлове.
          Носи движението, но не и извиването на страниците: тук корицата е
          равна плоскост, която се върти около тегела.
        </p>
      </header>

      <section className="overflow-hidden rounded-md border border-border bg-[var(--surface-1)] px-6 py-10">
        <h2 className="text-center font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Посочете книга — излиза напред и открехва капаците си
        </h2>
        <BookRow books={books.slice(0, 3)} />
      </section>

      <section className="rounded-md border border-border bg-[var(--surface-2)] px-6 py-10">
        <h2 className="mb-2 text-center font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Движете мишката — книгата следва курсора
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Хванете и дръпнете настрани: колкото по-бързо, толкова повече се
          отваря. Дръпнете нагоре или надолу, за да я наклоните. Докато е
          хваната, курсорът не я води — командва само ръката. В режим
          „Разлисти“ плъзгането наляво отгръща напред, надясно — назад; работи
          и с мишка, и с пръст.
        </p>
        {main ? (
          // Пет празни листа — щом качите снимките на страниците, на тяхно
          // място влизат адресите им и нищо друго не се променя.
          <BookLab cover={main.cover} title={main.title} pages={[null, null, null, null, null]} />
        ) : (
          <p className="text-center text-muted-foreground">
            Няма публикуван продукт с корица.
          </p>
        )}
      </section>
    </div>
  );
}
