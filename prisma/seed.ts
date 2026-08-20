/**
 * Начални данни за Remind Books.
 *
 * Изпълнява се с `npm run db:seed`. Скриптът е идемпотентен — може да се пуска
 * многократно, без да дублира записи (използва upsert по уникални полета).
 *
 * Създава: администраторски профил, категории, примерни продукти, блог
 * публикации и един промо код — достатъчно, за да изглежда сайтът завършен
 * при първото пускане и при демонстрация пред клиента.
 */

import { randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@remindbooks.com";

/**
 * Паролата на администратора няма стойност по подразбиране в кода.
 *
 * Парола, записана в хранилището, е публична парола — а подразбиращата се
 * почти никога не се сменя. Затова, ако `SEED_ADMIN_PASSWORD` не е зададена,
 * тук се тегли случайна и се изписва еднократно в конзолата. Никъде не се
 * записва: ако се изгуби, се минава през „Забравена парола“.
 */
const GIVEN_PASSWORD = process.env.SEED_ADMIN_PASSWORD?.trim();
const ADMIN_PASSWORD = GIVEN_PASSWORD || randomBytes(15).toString("base64url");

async function main() {
  console.log("Създаване на начални данни…\n");

  // ---------------------------------------------------------------
  // Администратор
  // ---------------------------------------------------------------
  // Проверката „съществува ли“ е отделно от записа нарочно: така накрая
  // скриптът знае дали паролата, която ще изпише, е новосъздадената, или
  // профилът е стар и паролата му е друга. При upsert тази разлика се губи.
  const existing = await db.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true },
  });

  const admin = existing
    ? // Ролята се налага и при повторно пускане, но паролата не се презаписва.
      await db.user.update({
        where: { id: existing.id },
        data: { role: "ADMIN" },
      })
    : await db.user.create({
        data: {
          email: ADMIN_EMAIL,
          name: "Администратор",
          passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 12),
          role: "ADMIN",
          emailVerified: new Date(),
        },
      });
  console.log(`✓ Администратор: ${admin.email}`);

  // ---------------------------------------------------------------
  // Категории
  // ---------------------------------------------------------------
  const categoryData = [
    { name: "Саморазвитие", slug: "samorazvitie", order: 1 },
    { name: "Медитация и осъзнатост", slug: "meditacia", order: 2 },
    { name: "Психология", slug: "psihologia", order: 3 },
    { name: "Отношения", slug: "otnoshenia", order: 4 },
    { name: "Поезия и есета", slug: "poezia", order: 5 },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoryData) {
    const created = await db.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, order: cat.order },
    });
    categories[cat.slug] = created.id;
  }
  console.log(`✓ Категории: ${categoryData.length}`);

  // ---------------------------------------------------------------
  // Продукти
  // ---------------------------------------------------------------
  const products = [
    {
      type: "PHYSICAL" as const,
      slug: "vatreshniyat-kompas",
      title: "Вътрешният компас",
      author: "Мария Динева",
      shortDesc:
        "Практическо ръководство за хора, които са загубили посоката и искат да я намерят сами.",
      description: `<p>Има моменти, в които всичко отвън изглежда наред, а вътре нещо не се връзва. Тази книга е за точно такива моменти.</p>
<p><strong>Вътрешният компас</strong> не дава готови отговори — вместо това предлага въпроси, които водят до тях. Всяка глава завършва с кратка практика, отнемаща не повече от десет минути на ден.</p>
<h2>За кого е тази книга</h2>
<ul>
  <li>За хората в средата на кариера, които усещат, че са тръгнали по чужд път.</li>
  <li>За тези, които са опитвали „позитивно мислене“ и то не е сработило.</li>
  <li>За всеки, който предпочита въпроси пред съвети.</li>
</ul>
<blockquote>Посоката не се намира отвън. Само се разпознава отвътре.</blockquote>`,
      priceCents: 2490,
      compareAtCents: 2990,
      stock: 24,
      categoryId: categories.samorazvitie,
      isPublished: true,
      isBestseller: true,
      isFeatured: true,
    },
    {
      type: "PHYSICAL" as const,
      slug: "tihi-utrini",
      title: "Тихи утрини",
      author: "Ивайло Петров",
      shortDesc:
        "Трийсет сутрешни практики за хора, които мразят сутрините.",
      description: `<p>Не всяка сутрин трябва да започва в пет часа с ледена вана. Тази книга предлага друг подход — по-тих, по-човешки и, за изненада на мнозина, по-устойчив.</p>
<p>Трийсет кратки глави, всяка от които се чете за пет минути и се практикува за десет.</p>`,
      priceCents: 1990,
      stock: 12,
      categoryId: categories.meditacia,
      isPublished: true,
      isBestseller: true,
    },
    {
      type: "PHYSICAL" as const,
      slug: "razgovori-s-neudobnoto",
      title: "Разговори с неудобното",
      author: "Д-р Елена Стоянова",
      shortDesc:
        "Как да говорим за нещата, които обикновено премълчаваме.",
      description: `<p>Повечето отношения не се разпадат заради големите скандали, а заради разговорите, които никога не се случват.</p>
<p>Клиничен психолог с двадесетгодишна практика разказва как се води труден разговор — без обвинения, без отстъпление и без илюзията, че ще бъде лесно.</p>`,
      priceCents: 2790,
      stock: 3,
      lowStockAlert: 5,
      categoryId: categories.otnoshenia,
      isPublished: true,
    },
    {
      type: "PHYSICAL" as const,
      slug: "pisma-do-po-mladiya-az",
      title: "Писма до по-младия аз",
      author: "Колектив",
      shortDesc: "Четиридесет писма от хора, минали по пътя преди нас.",
      description: `<p>Сборник от четиридесет писма, написани от хора на различна възраст и професия до собственото им двадесетгодишно „аз“.</p>
<p>Някои са смешни. Други болят. Всички са истински.</p>`,
      priceCents: 2290,
      stock: 18,
      categoryId: categories.poezia,
      isPublished: true,
    },
    {
      type: "PDF" as const,
      slug: "nachaloto-e-dnes",
      title: "Началото е днес",
      author: "Мария Динева",
      shortDesc:
        "Кратко ръководство за първата стъпка — в PDF формат, за четене веднага.",
      description: `<p>Най-трудната част от всяка промяна не е издържането. А започването.</p>
<p>Това кратко ръководство (86 страници) разглежда защо отлагаме и какво реално помага. Без мотивационни лозунги.</p>
<h2>Какво съдържа</h2>
<ul>
  <li>Защо „чакам подходящия момент“ е най-скъпото изречение.</li>
  <li>Правилото на петте минути и защо работи.</li>
  <li>Как да проектирате среда, в която е по-лесно да започнете.</li>
</ul>`,
      priceCents: 1490,
      compareAtCents: 1990,
      previewPages: 8,
      categoryId: categories.samorazvitie,
      isPublished: true,
      isFeatured: true,
    },
    {
      type: "PDF" as const,
      slug: "azbuka-na-osazatostta",
      title: "Азбука на осъзнатостта",
      author: "Ивайло Петров",
      shortDesc: "От А до Я — понятията, които всеки чува, но малцина разбират.",
      description: `<p>Осъзнатост, присъствие, приемане — думи, които се повтарят толкова често, че са загубили смисъл.</p>
<p>Тази дигитална книга връща значението им, обяснено просто и без езотерика.</p>`,
      priceCents: 1290,
      previewPages: 6,
      categoryId: categories.meditacia,
      isPublished: true,
    },
    {
      type: "PDF" as const,
      slug: "kogato-trevogata-govori",
      title: "Когато тревогата говори",
      author: "Д-р Елена Стоянова",
      shortDesc: "Работна тетрадка с упражнения при тревожност.",
      description: `<p>Практическа работна тетрадка с 24 упражнения, базирани на когнитивно-поведенчески подход.</p>
<p><em>Не замества професионална помощ, но е добро начало.</em></p>`,
      priceCents: 1790,
      previewPages: 10,
      categoryId: categories.psihologia,
      isPublished: true,
    },
    {
      type: "AUDIO" as const,
      slug: "sutreshna-praktika-10-minuti",
      title: "Сутрешна практика за 10 минути",
      author: "Ивайло Петров",
      shortDesc: "Кратка водена практика за начало на деня. Безплатно.",
      description: `<p>Десет минути, които променят тона на целия ден. Без предварителна подготовка, без специална поза.</p>
<p>Тази практика е безплатна и остава такава — смятаме, че всеки трябва да има достъп до нея.</p>`,
      priceCents: 0,
      isFree: true,
      durationSeconds: 612,
      categoryId: categories.meditacia,
      isPublished: true,
      isFeatured: true,
    },
    {
      type: "AUDIO" as const,
      slug: "vecherno-uspokoyavane",
      title: "Вечерно успокояване",
      author: "Ивайло Петров",
      shortDesc: "Двадесет и пет минути за преход към съня.",
      description: `<p>Водена практика за вечерта, създадена за хора, чийто ум не спира, когато главата докосне възглавницата.</p>
<p>Записана с меко темпо и дълги паузи. Може да заспите преди края — това е целта.</p>`,
      priceCents: 990,
      durationSeconds: 1508,
      categoryId: categories.meditacia,
      isPublished: true,
    },
    {
      type: "AUDIO" as const,
      slug: "vatreshniyat-kompas-audio",
      title: "Вътрешният компас — авторско четене",
      author: "Мария Динева",
      shortDesc: "Пълната книга, прочетена от самата авторка.",
      description: `<p>Цялата книга „Вътрешният компас“ в авторско изпълнение — четири часа и половина.</p>
<p>Авторката добавя коментари между главите, които ги няма в печатното издание.</p>`,
      priceCents: 2490,
      compareAtCents: 2990,
      durationSeconds: 16200,
      categoryId: categories.samorazvitie,
      isPublished: true,
      isBestseller: true,
    },
  ];

  for (const product of products) {
    await db.product.upsert({
      where: { slug: product.slug },
      create: product,
      update: {
        title: product.title,
        author: product.author,
        shortDesc: product.shortDesc,
        description: product.description,
        priceCents: product.priceCents,
        compareAtCents: product.compareAtCents ?? null,
        isPublished: product.isPublished,
      },
    });
  }
  console.log(`✓ Продукти: ${products.length}`);

  // Свързани заглавия за най-важната книга
  const compass = await db.product.findUnique({
    where: { slug: "vatreshniyat-kompas" },
    select: { id: true },
  });
  const relatedSlugs = ["nachaloto-e-dnes", "tihi-utrini", "vatreshniyat-kompas-audio"];

  if (compass) {
    for (const slug of relatedSlugs) {
      const target = await db.product.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (target) {
        await db.productRelation.upsert({
          where: {
            sourceId_targetId: { sourceId: compass.id, targetId: target.id },
          },
          create: { sourceId: compass.id, targetId: target.id },
          update: {},
        });
      }
    }
    console.log(`✓ Свързани заглавия: ${relatedSlugs.length}`);
  }

  // ---------------------------------------------------------------
  // Блог публикации
  // ---------------------------------------------------------------
  const tagData = [
    { name: "Практики", slug: "praktiki" },
    { name: "Четене", slug: "chetene" },
    { name: "Зад кулисите", slug: "zad-kulisite" },
  ];

  for (const tag of tagData) {
    await db.tag.upsert({
      where: { slug: tag.slug },
      create: tag,
      update: { name: tag.name },
    });
  }

  const posts = [
    {
      slug: "kak-da-chetem-po-malko-i-da-razbirame-poveche",
      title: "Как да четем по-малко и да разбираме повече",
      excerpt:
        "Броят прочетени книги за година е най-безполезната метрика, която сме си измислили. Ето какво предлагаме вместо нея.",
      body: `<p>Всеки януари социалните мрежи се пълнят с амбиции: „тази година — петдесет книги“. Към март амбицията се превръща във вина, а към юни — в тишина.</p>
<h2>Проблемът с броенето</h2>
<p>Когато целта е брой, мозъкът оптимизира за брой. Четем по-бързо, прескачаме, избираме по-тънки книги. Стигаме до края, но не носим нищо със себе си.</p>
<h2>Какво предлагаме вместо това</h2>
<p>Опитайте с една книга на месец, но с условие: след като я затворите, записвате три изречения. Не резюме — три неща, които ще направите различно.</p>
<blockquote>Книга, която не променя нищо в поведението, е била развлечение. Което също е добре — но да си го признаем.</blockquote>
<p>След година ще имате трийсет и шест изречения. Гарантираме, че тежат повече от петдесет заглавия в списък.</p>`,
      tags: ["chetene", "praktiki"],
      daysAgo: 4,
    },
    {
      slug: "pette-minuti-koito-promenyat-sutrinta",
      title: "Петте минути, които променят сутринта",
      excerpt:
        "Не е нужно да ставате в пет. Нужно е първите пет минути да не са в телефона.",
      body: `<p>Съветите за сутрешни ритуали обикновено започват с час, който повечето хора не приемат: 5:00. После идват ледената вана, дневникът и трийсетминутната медитация.</p>
<p>Проблемът не е, че тези неща не работят. Проблемът е, че искат от вас да станете друг човек за една нощ.</p>
<h2>По-малката промяна</h2>
<p>Оставете телефона извън спалнята. Само това. Първите пет минути от деня прекарайте без екран — с кафе, с прозорец, с нищо.</p>
<p>Звучи твърде малко, за да има значение. Точно затова работи: достатъчно малко е, за да го направите утре.</p>`,
      tags: ["praktiki"],
      daysAgo: 12,
    },
    {
      slug: "zashto-izdavame-i-audio",
      title: "Защо издаваме и аудио версии",
      excerpt:
        "Един читател ни писа, че книгата ни е единственото нещо, което успява да „прочете“ в задръстването. Това реши въпроса.",
      body: `<p>Дълго време имахме съмнения относно аудио форматите. Смятахме, че четенето с очи е по-дълбоко, че записът превръща книгата в консумация.</p>
<p>После получихме писмо от читателка, която работи на две места и има две деца. Единственото ѝ време за книга е четиридесетте минути в колата.</p>
<h2>Промяната на мнението</h2>
<p>Не е важно как влиза съдържанието. Важно е дали остава.</p>
<p>Днес почти всяко наше заглавие има аудио версия, а част от практиките са напълно безплатни. Не защото е модерно, а защото един конкретен човек ни обясни защо е нужно.</p>`,
      tags: ["zad-kulisite"],
      daysAgo: 25,
    },
  ];

  for (const post of posts) {
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - post.daysAgo);

    await db.post.upsert({
      where: { slug: post.slug },
      create: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        isPublished: true,
        publishedAt,
        tags: { connect: post.tags.map((slug) => ({ slug })) },
      },
      update: {
        title: post.title,
        excerpt: post.excerpt,
        body: post.body,
        isPublished: true,
      },
    });
  }
  console.log(`✓ Блог публикации: ${posts.length}`);

  // ---------------------------------------------------------------
  // Промо код
  // ---------------------------------------------------------------
  const expiresAt = new Date();
  expiresAt.setMonth(expiresAt.getMonth() + 3);

  await db.promoCode.upsert({
    where: { code: "DOBREDOSHLI" },
    create: {
      code: "DOBREDOSHLI",
      discountType: "PERCENT",
      amount: 10,
      minOrderCents: 2000,
      expiresAt,
      maxUses: 100,
      isActive: true,
      description: "Приветствена отстъпка за нови клиенти",
    },
    update: {},
  });
  console.log("✓ Промо код: DOBREDOSHLI (−10%)");

  // ---------------------------------------------------------------
  // Настройки
  // ---------------------------------------------------------------
  await db.setting.upsert({
    where: { key: "about_short" },
    create: {
      key: "about_short",
      value:
        "Remind Books започна с едно просто убеждение: правилната книга, срещната в правилния момент, може да върне посоката на цял един живот. Издаваме и подбираме заглавия за хора, които търсят своя вътрешен компас.",
    },
    update: {},
  });
  console.log("✓ Начални настройки\n");

  console.log("Готово.\n");
  console.log("────────────────────────────────────────");
  console.log("  Вход в административния панел:");
  console.log(`  Имейл:  ${ADMIN_EMAIL}`);
  if (existing) {
    console.log("  Парола: (профилът е от предишно пускане — непроменена)");
  } else if (GIVEN_PASSWORD) {
    console.log("  Парола: (стойността на SEED_ADMIN_PASSWORD)");
  } else {
    console.log(`  Парола: ${ADMIN_PASSWORD}`);
    console.log("          ↑ изписва се само сега — запишете я");
  }
  console.log("  Адрес:  /vhod  →  после /admin");
  console.log("────────────────────────────────────────");
  console.log("\nВАЖНО: сменете паролата веднага след първия вход.\n");
}

main()
  .catch((error) => {
    console.error("Грешка при създаване на началните данни:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
