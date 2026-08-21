import { cache } from "react";

import { db } from "@/lib/db";
import { publicUrl } from "@/lib/storage";

/**
 * Снимките, които са част от оформлението.
 *
 * Съдържанието на сайта — корици, снимки в блога, изображения на продукти —
 * се качва при самия продукт или публикация. Тези тук са друго: те са част от
 * дизайна и стоят на едни и същи места, независимо какво има в каталога.
 *
 * Всяка от тях може да бъде подменена от админ панела (Оформление). Докато
 * това не е направено, важи вграденият файл от `public/images` — така сайтът
 * изглежда завършен от първия ден, без нищо да е качвано.
 */

/** Вградените файлове. Те са и резервната стойност за всяко място. */
const BUNDLED = {
  logo: "/logo.webp",
  hero: "/images/hero-library.jpg",
  books: "/images/banner-books.jpg",
  pdf: "/images/banner-pdf.jpg",
  audio: "/images/banner-audio.jpg",
  blog: "/images/banner-blog.jpg",
  about: "/images/about-reading.jpg",
  postFallback: "/images/blog-placeholder.jpg",
  ogImage: "/og-image.jpg",
} as const;

export type ImageSlot = keyof typeof BUNDLED;

export type ImageSlotInfo = {
  slot: ImageSlot;
  /** Ключът в таблицата `Setting`, под който стои качената снимка. */
  setting: string;
  label: string;
  /** Къде се вижда — надписът в панела. */
  where: string;
  /** Съотношението, в което рамката ще я изреже. */
  ratio: string;
};

/**
 * Описанието на местата стига до панела — надписите там идват оттук, за да не
 * се разминават с това, което кодът наистина използва.
 */
export const IMAGE_SLOTS: readonly ImageSlotInfo[] = [
  {
    slot: "logo",
    setting: "img_logo",
    label: "Лого",
    where: "Заглавната лента, footer-ът и страницата за вход",
    ratio: "широко, около 430:176",
  },
  {
    slot: "hero",
    setting: "img_hero",
    label: "Заглавна секция",
    where: "Начална страница — фонът зад заглавието и книгите",
    ratio: "2:1 (широка)",
  },
  {
    slot: "books",
    setting: "img_banner_books",
    label: "Лента „Физически книги“",
    where: "Заглавната лента на /knigi",
    ratio: "21:9 (много широка)",
  },
  {
    slot: "pdf",
    setting: "img_banner_pdf",
    label: "Лента „PDF книги“",
    where: "Заглавната лента на /pdf",
    ratio: "21:9 (много широка)",
  },
  {
    slot: "audio",
    setting: "img_banner_audio",
    label: "Лента „Аудио“",
    where: "Заглавната лента на /audio",
    ratio: "21:9 (много широка)",
  },
  {
    slot: "blog",
    setting: "img_banner_blog",
    label: "Лента „Блог“",
    where: "Заглавната лента на /blog",
    ratio: "21:9 (много широка)",
  },
  {
    slot: "about",
    setting: "img_about",
    label: "„За нас“",
    where: "Картата на началната страница и лентата на /za-nas",
    ratio: "3:2",
  },
  {
    slot: "postFallback",
    setting: "img_post_fallback",
    label: "Публикация без корица",
    where: "Стои на мястото на липсваща снимка в блога",
    ratio: "3:2",
  },
  {
    slot: "ogImage",
    setting: "img_og",
    label: "Снимка при споделяне",
    where: "Показва се, когато адресът на сайта бъде споделен в социална мрежа",
    ratio: "1200×630",
  },
] as const;

export type SiteImages = Record<ImageSlot, string>;

/**
 * Адресите, с които сайтът да се покаже сега.
 *
 * Качената снимка бие вградената. Ако качената сочи към частна папка или
 * хранилището не е конфигурирано, `publicUrl` връща null — тогава пак важи
 * вградената, вместо страницата да зее с празна рамка.
 */
export const getSiteImages = cache(async function getSiteImages(): Promise<SiteImages> {
  const rows = await db.setting.findMany({
    where: { key: { in: IMAGE_SLOTS.map((s) => s.setting) } },
  });
  const stored = new Map(rows.map((r) => [r.key, r.value]));

  const images = { ...BUNDLED } as SiteImages;
  for (const info of IMAGE_SLOTS) {
    const key = stored.get(info.setting)?.trim();
    const url = key ? publicUrl(key) : null;
    if (url) images[info.slot] = url;
  }
  return images;
});

/**
 * Същото, но за панела: освен адреса се вижда и дали снимката е качена, или е
 * вградената. Оттам зависи дали да се предложи „Върни вградената“.
 */
export async function getSiteImagesForAdmin(): Promise<
  (ImageSlotInfo & { url: string; custom: boolean })[]
> {
  const rows = await db.setting.findMany({
    where: { key: { in: IMAGE_SLOTS.map((s) => s.setting) } },
  });
  const stored = new Map(rows.map((r) => [r.key, r.value]));

  return IMAGE_SLOTS.map((info) => {
    const key = stored.get(info.setting)?.trim();
    const url = key ? publicUrl(key) : null;
    return {
      ...info,
      url: url ?? BUNDLED[info.slot],
      custom: Boolean(url),
    };
  });
}
