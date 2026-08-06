import type { Metadata } from "next";
import Image from "next/image";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";
import { PageHeader, Card, ButtonLink } from "@/components/ui";
import { NewsletterForm } from "@/components/newsletter-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "За нас",
  description:
    "Историята, мисията и ценностите на Remind Books — издателството за книги, които връщат посоката.",
  alternates: { canonical: "/za-nas" },
};

/**
 * Текстовете идват от таблицата Setting, за да може собственикът да ги
 * редактира от админ панела без намеса на разработчик. Стойностите по
 * подразбиране позволяват страницата да изглежда завършена от първия ден.
 */
const DEFAULTS: Record<string, string> = {
  about_title: "Книги, които връщат посоката",
  about_intro:
    "Remind Books започна с едно просто убеждение: правилната книга, срещната в правилния момент, може да върне посоката на цял един живот.",
  about_story: `<p>Всичко тръгна от една лавица с книги и от навика да подаряваме заглавия на хора, които минават през труден период. Забелязахме нещо: почти винаги човекът се връщаше след месец с думите „точно това ми трябваше“.</p>
<p>Така се роди Remind Books — място, където подбираме и издаваме заглавия за хора, търсещи своя вътрешен компас. Не обещаваме бързи решения. Обещаваме честни книги, написани от хора, минали по пътя.</p>
<p>Днес освен хартиени издания предлагаме дигитални книги и аудио практики, защото знаем, че понякога посоката се намира в колата, на разходка или в тихите пет минути преди сън.</p>`,
  about_mission:
    "Да правим достъпни книгите и практиките, които помагат на човек да чуе себе си — на хартия, на екран и в слушалки.",
  about_values_1_title: "Честност",
  about_values_1_text:
    "Издаваме само заглавия, които бихме подарили на близък човек. Без обещания за чудеса.",
  about_values_2_title: "Достъпност",
  about_values_2_text:
    "Всяка книга има безплатен откъс. Част от аудио съдържанието е напълно безплатно.",
  about_values_3_title: "Внимание",
  about_values_3_text:
    "Отговаряме на всяко съобщение лично. Зад Remind Books стоят хора, не автоматични отговори.",
  about_image: "",
};

async function getContent(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany({
    where: { key: { startsWith: "about_" } },
  });
  const map = { ...DEFAULTS };
  for (const row of rows) {
    if (row.value.trim()) map[row.key] = row.value;
  }
  return map;
}

export default async function AboutPage() {
  const c = await getContent();
  const image = publicUrl(c.about_image || null);

  const values = [
    { title: c.about_values_1_title, text: c.about_values_1_text },
    { title: c.about_values_2_title, text: c.about_values_2_text },
    { title: c.about_values_3_title, text: c.about_values_3_text },
  ];

  return (
    <div className="container-page py-12">
      <div className="max-w-3xl">
        <PageHeader title={c.about_title!} description={c.about_intro} />
      </div>

      {image && (
        <div className="relative aspect-[21/9] my-10 bg-muted rounded-md overflow-hidden border border-border">
          <Image
            src={image}
            alt="Remind Books"
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-12 mt-4">
        <div className="lg:col-span-2">
          <h2 className="text-2xl rule mb-6">Нашата история</h2>
          <div
            className="prose-rmb text-[17px]"
            dangerouslySetInnerHTML={{ __html: c.about_story! }}
          />
        </div>

        <aside className="lg:col-span-1">
          <Card className="p-6 bg-muted border-0 lg:sticky lg:top-24">
            <h2 className="font-sans text-xs font-bold uppercase tracking-[0.15em] text-primary">
              Мисията ни
            </h2>
            <p className="mt-3 text-lg leading-relaxed">{c.about_mission}</p>
          </Card>
        </aside>
      </div>

      {/* Ценности */}
      <section className="mt-20" aria-labelledby="values">
        <h2 id="values" className="text-2xl rule mb-8">
          Ценности
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {values.map((v, i) => (
            <Card key={i} className="p-6">
              <span className="font-mono text-xs text-primary">0{i + 1}</span>
              <h3 className="mt-2 font-sans text-lg font-bold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {v.text}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* Призив */}
      <section className="mt-20">
        <Card className="p-8 sm:p-12 text-center">
          <h2 className="text-2xl sm:text-3xl">Да останем свързани</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Абонирайте се за бюлетина или ни пишете — винаги се радваме на
            съобщения от читатели.
          </p>
          <div className="mt-6 max-w-md mx-auto text-left">
            <NewsletterForm source="about" />
          </div>
          <ButtonLink href="/kontakti" variant="outline" className="mt-6">
            Свържете се с нас
          </ButtonLink>
        </Card>
      </section>
    </div>
  );
}
