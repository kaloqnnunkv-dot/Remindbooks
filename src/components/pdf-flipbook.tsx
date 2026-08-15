"use client";

import { useCallback, useRef, useState } from "react";
import { Book3D } from "./book-3d";

/**
 * PDF книга, която се разлиства като истинска.
 *
 * Страниците на безплатния откъс се превръщат в картинки чак когато читателят
 * натисне „Разлисти“. Дотогава не се тегли нищо — самият откъс тежи стотици
 * килобайта, а повечето посетители няма да го отворят.
 *
 * Изчертаването става в браузъра с pdf.js. Библиотеката е около половин
 * мегабайт и се внася динамично, тъй че не влиза в първоначалния пакет на
 * страницата.
 */
export function PdfFlipbook({
  cover,
  title,
  previewUrl,
  pageCount,
}: {
  cover: string | null;
  title: string;
  /** Адрес на откъса — през наш маршрут, за да няма спънки с CORS. */
  previewUrl: string;
  pageCount: number;
}) {
  // Празните листа съществуват от самото начало: така книгата има правилния
  // брой страници още преди да е дошло съдържанието и нищо не подскача, щом
  // картинките пристигнат.
  const [pages, setPages] = useState<(string | null)[]>(
    () => Array.from({ length: Math.max(pageCount, 2) }, () => null),
  );
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const load = useCallback(async () => {
    if (started.current) return;
    started.current = true;

    try {
      const pdfjs = await import("pdfjs-dist");
      // Работникът се разнася от webpack като отделен файл — затова адресът се
      // строи през `import.meta.url`, а не се пише на ръка.
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();

      const doc = await pdfjs.getDocument({ url: previewUrl }).promise;
      const count = Math.min(doc.numPages, Math.max(pageCount, doc.numPages));

      for (let n = 1; n <= count; n++) {
        const page = await doc.getPage(n);
        // Мащаб към около 700 пиксела ширина: достатъчно четимо при
        // приближената книга, без страницата да тежи излишно.
        const base = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: 700 / base.width });

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) break;

        // Хартиена основа — иначе прозрачните места излизат черни.
        ctx.fillStyle = "#fdfaf1";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;

        const url = canvas.toDataURL("image/jpeg", 0.82);
        // Всяка готова страница влиза веднага — първата се вижда, докато
        // останалите още се чертаят.
        setPages((prev) => {
          const next = prev.slice();
          while (next.length < n) next.push(null);
          next[n - 1] = url;
          return next;
        });
      }
    } catch {
      // Ако нещо се обърка, книгата остава с празни листа, а под нея се появява
      // връзка към самия файл — читателят не остава без откъса.
      setFailed(true);
    }
  }, [previewUrl, pageCount]);

  return (
    <div>
      <Book3D cover={cover} title={title} pages={pages} onOpen={load} />
      {failed && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Откъсът не можа да се изчертае тук.{" "}
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans font-bold text-primary underline-offset-4 hover:underline"
          >
            Отворете го като PDF
          </a>
          .
        </p>
      )}
    </div>
  );
}
