import "server-only";
import { PDFDocument } from "pdf-lib";

/**
 * Работа с PDF файлове на сървъра.
 *
 * Безплатният откъс се генерира автоматично от качената книга. Така
 * администраторът не подготвя втори файл ръчно и откъсът винаги съответства
 * на актуалното издание — при подмяна на книгата се подменя и откъсът.
 */

export type PdfInfo = { pageCount: number; encrypted: boolean };

/** Чете броя страници. Връща null, ако файлът не е валиден PDF. */
export async function readPdfInfo(buffer: Buffer): Promise<PdfInfo | null> {
  try {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return { pageCount: doc.getPageCount(), encrypted: doc.isEncrypted };
  } catch {
    return null;
  }
}

/**
 * Създава нов PDF само с първите `pages` страници.
 *
 * Страниците се копират в нов документ, а не се изтриват от копие на
 * оригинала — така в откъса не остават следи от останалото съдържание.
 * Връща null, ако файлът не може да бъде обработен.
 */
export async function extractFirstPages(
  buffer: Buffer,
  pages: number,
): Promise<{ data: Buffer; pageCount: number } | null> {
  if (pages <= 0) return null;

  try {
    const source = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const total = source.getPageCount();
    if (total === 0) return null;

    const take = Math.min(pages, total);
    const preview = await PDFDocument.create();

    const copied = await preview.copyPages(
      source,
      Array.from({ length: take }, (_, i) => i),
    );
    for (const page of copied) preview.addPage(page);

    // Метаданните подсказват в четеца, че това е откъс.
    preview.setTitle(`${source.getTitle() ?? "Откъс"} — безплатен откъс`);
    preview.setProducer("ReMindBooks");

    const bytes = await preview.save({ useObjectStreams: true });
    return { data: Buffer.from(bytes), pageCount: take };
  } catch (err) {
    console.error("[pdf] Генерирането на откъс се провали:", err);
    return null;
  }
}

/** Брой страници в безплатния откъс по подразбиране. */
export const DEFAULT_PREVIEW_PAGES = 5;
