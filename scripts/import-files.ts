/**
 * Внасяне на реални файлове като продукти.
 *
 * Качва PDF книгите, генерира безплатните откъси, качва корицата и видеото
 * и създава съответните записи в базата.
 *
 * Употреба:
 *   npx tsx scripts/import-files.ts "C:\\път\\до\\папката"
 *
 * Скриптът е идемпотентен по slug — повторно пускане обновява записите,
 * вместо да ги дублира.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { PrismaClient, type ProductType } from "@prisma/client";
import { PDFDocument } from "pdf-lib";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const db = new PrismaClient();

const s3 = new S3Client({
  region: process.env.S3_REGION ?? "auto",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.S3_BUCKET!;
const PREVIEW_PAGES = 5;

async function upload(folder: string, filename: string, body: Buffer, type: string) {
  const key = `${folder}/${randomUUID()}${path.extname(filename).toLowerCase()}`;
  await s3.send(
    new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: type }),
  );
  return key;
}

async function firstPages(buffer: Buffer, pages: number) {
  const src = await PDFDocument.load(buffer, { ignoreEncryption: true });
  const take = Math.min(pages, src.getPageCount());
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, Array.from({ length: take }, (_, i) => i));
  for (const p of copied) out.addPage(p);
  out.setProducer("Remind Books");
  return { data: Buffer.from(await out.save()), take, total: src.getPageCount() };
}

/** Описанията са примерни — собственикът ги редактира от админ панела. */
const BOOKS: Record<string, { title: string; author: string; short: string; body: string; price: number; compareAt?: number; featured?: boolean; bestseller?: boolean }> = {
  "Антикрехкост_Сянката_и_Контролът (1).pdf": {
    title: "Антикрехкост, Сянката и Контролът",
    author: "Remind Books",
    short: "За силата, която се ражда от натиска, и за частите от нас, които предпочитаме да не гледаме.",
    body: `<p>Има неща, които се чупят под натиск. Има и такива, които стават по-здрави заради него.</p>
<p>Тази книга разглежда трите понятия, които най-често се преплитат, когато говорим за вътрешна устойчивост: <strong>антикрехкостта</strong>, <strong>сянката</strong> и <strong>контролът</strong>.</p>
<h2>Какво ще намерите вътре</h2>
<ul>
  <li>Защо избягването на трудности ни прави по-крехки.</li>
  <li>Как разпознаваме собствената си сянка — и защо тя не е враг.</li>
  <li>Разликата между контрол и присъствие.</li>
</ul>`,
    price: 1490,
    compareAt: 1990,
    featured: true,
  },
  "Как мозъкът контролира емоциите - Google Docs.pdf": {
    title: "Как мозъкът контролира емоциите",
    author: "Remind Books",
    short: "Какво се случва в главата ни в момента, в който нещо ни разстрои — обяснено просто.",
    body: `<p>Емоциите не идват от нищото. Зад всяка има съвсем конкретен механизъм.</p>
<p>Тази книга обяснява как работи връзката между тялото, мозъка и това, което наричаме чувство — без научен жаргон и без опростяване до безсмислие.</p>
<h2>За кого е</h2>
<ul>
  <li>За хора, които реагират по-силно, отколкото им се иска.</li>
  <li>За всеки, който е чувал „просто се успокой“ и знае, че не работи.</li>
</ul>`,
    price: 1290,
    bestseller: true,
  },
  "Не чакай да ти се прииска.pdf": {
    title: "Не чакай да ти се прииска",
    author: "Remind Books",
    short: "63 страници за най-скъпата илюзия — че един ден просто ще ни се доще.",
    body: `<p>Чакаме мотивация, както се чака автобус. Понякога идва. По-често — не.</p>
<p>Тази книга предлага друга отправна точка: действието предхожда желанието, а не обратното.</p>
<blockquote>Мотивацията не е гориво. Тя е изгорели газове — появява се след като си тръгнал.</blockquote>
<h2>Съдържание</h2>
<ul>
  <li>Защо чакането на „подходящия момент“ е най-скъпото решение.</li>
  <li>Как се проектира среда, в която е по-лесно да започнеш.</li>
  <li>Какво да правим в дните, в които наистина не можем.</li>
</ul>`,
    price: 1990,
    compareAt: 2490,
    bestseller: true,
    featured: true,
  },
  "Огледалото_на_себе_си.docx (1).pdf": {
    title: "Огледалото на себе си",
    author: "Remind Books",
    short: "Десет минути на ден пред най-трудното огледало — вашето собствено.",
    body: `<p>Най-трудният поглед не е навън, а навътре.</p>
<p>Кратка практическа книга с десетминутни упражнения за всеки ден. Не изисква предварителна подготовка, само готовност да си зададете няколко неудобни въпроса.</p>`,
    price: 1590,
  },
};

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error("Употреба: npx tsx scripts/import-files.ts \"<папка>\"");
    process.exit(1);
  }
  if (!BUCKET || !process.env.S3_ACCESS_KEY_ID) {
    console.error("Липсват настройките за S3/R2 в .env");
    process.exit(1);
  }

  const files = await fs.readdir(dir);
  console.log(`Намерени ${files.length} файла в ${dir}\n`);

  // --- Корица и видео -------------------------------------------------
  const coverFile = files.find((f) => /корица/i.test(f));
  const videoFile = files.find((f) => f.toLowerCase().endsWith(".mp4"));

  let sharedCoverKey: string | null = null;
  if (coverFile) {
    const buf = await fs.readFile(path.join(dir, coverFile));
    // .jfif е JPEG с друго разширение — качваме го като .jpg,
    // за да го разпознаят браузърите и оптимизаторът на Next.
    sharedCoverKey = await upload("covers", "korica.jpg", buf, "image/jpeg");
    console.log(`✓ Корица качена (${(buf.length / 1024).toFixed(0)} KB)`);
  }

  // --- PDF книги ------------------------------------------------------
  for (const [filename, meta] of Object.entries(BOOKS)) {
    if (!files.includes(filename)) {
      console.log(`⊘ Пропуснат (липсва): ${filename}`);
      continue;
    }

    const buf = await fs.readFile(path.join(dir, filename));
    const fileKey = await upload("pdf", filename, buf, "application/pdf");

    const excerpt = await firstPages(buf, PREVIEW_PAGES);
    const previewKey = await upload(
      "previews",
      `preview-${filename}`,
      excerpt.data,
      "application/pdf",
    );

    const slug = slugify(meta.title);

    await db.product.upsert({
      where: { slug },
      create: {
        type: "PDF" as ProductType,
        slug,
        title: meta.title,
        author: meta.author,
        shortDesc: meta.short,
        description: meta.body,
        priceCents: meta.price,
        compareAtCents: meta.compareAt ?? null,
        coverImage: sharedCoverKey,
        fileKey,
        previewKey,
        previewPages: excerpt.take,
        isPublished: true,
        isFeatured: meta.featured ?? false,
        isBestseller: meta.bestseller ?? false,
      },
      update: {
        title: meta.title,
        shortDesc: meta.short,
        description: meta.body,
        priceCents: meta.price,
        compareAtCents: meta.compareAt ?? null,
        fileKey,
        previewKey,
        previewPages: excerpt.take,
        ...(sharedCoverKey ? { coverImage: sharedCoverKey } : {}),
        isPublished: true,
      },
    });

    console.log(
      `✓ ${meta.title}  ·  ${excerpt.total} стр. → откъс ${excerpt.take} стр.  ·  ${(meta.price / 100).toFixed(2)} лв.`,
    );
  }

  // --- Видео (като аудио/видео продукт) -------------------------------
  if (videoFile) {
    const buf = await fs.readFile(path.join(dir, videoFile));
    const fileKey = await upload("audio", videoFile, buf, "video/mp4");
    const slug = "patyat-kam-sebe-si-video";

    await db.product.upsert({
      where: { slug },
      create: {
        type: "AUDIO" as ProductType,
        slug,
        title: "Пътят към себе си — видео",
        author: "Remind Books",
        shortDesc: "Кратко видео въведение към пътя навътре.",
        description:
          "<p>Видео материал, който въвежда в основните идеи зад поредицата „Пътят към себе си“.</p>",
        priceCents: 0,
        isFree: true,
        coverImage: sharedCoverKey,
        fileKey,
        isPublished: true,
        isFeatured: true,
      },
      update: { fileKey, isPublished: true, ...(sharedCoverKey ? { coverImage: sharedCoverKey } : {}) },
    });

    console.log(`✓ Видео качено (${(buf.length / 1024 / 1024).toFixed(1)} MB) — безплатно`);
  }

  const counts = await db.product.groupBy({ by: ["type"], _count: true });
  console.log("\nОбщо в каталога:", counts.map((c) => `${c.type}: ${c._count}`).join(", "));
}

const CYR: Record<string, string> = {
  а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",
  н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",
  щ:"sht",ъ:"a",ь:"y",ю:"yu",я:"ya",
};
function slugify(input: string): string {
  return input.toLowerCase().split("").map((c) => CYR[c] ?? c).join("")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

main()
  .catch((e) => {
    console.error("Грешка:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
