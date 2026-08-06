"use client";

import { useState } from "react";
import { Button } from "./ui";
import { FileTextIcon } from "./icons";

/**
 * Preview на първите страници от PDF книга.
 *
 * Файлът се зарежда лениво (чак след натискане), защото дори няколко страници
 * тежат стотици килобайта и не бива да се теглят при всяко отваряне на страницата.
 * Показва се през вградения PDF четец на браузъра — без външна библиотека.
 */
export function PdfPreview({
  previewUrl,
  pages,
  title,
}: {
  previewUrl: string;
  pages: number;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-primary/12 text-primary shrink-0">
            <FileTextIcon size={18} />
          </span>
          <div>
            <p className="font-sans text-sm font-bold">Безплатен откъс</p>
            <p className="text-xs text-muted-foreground">
              {pages > 0
                ? `Първите ${pages} ${pages === 1 ? "страница" : "страници"} от книгата`
                : "Прелистете преди да купите"}
            </p>
          </div>
        </div>

        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Прелисти
          </Button>
        )}
      </div>

      {open && (
        <>
          <object
            data={`${previewUrl}#toolbar=0&navpanes=0`}
            type="application/pdf"
            className="w-full h-[70vh] bg-muted"
            aria-label={`Откъс от „${title}“`}
          >
            {/* Резервен вариант за браузъри без вграден PDF четец (част от мобилните) */}
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Вашият браузър не може да покаже PDF файла директно.
              </p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-primary underline underline-offset-4 text-sm"
              >
                Отвори откъса в нов раздел
              </a>
            </div>
          </object>

          <div className="p-3 text-center border-t border-border">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Затвори откъса
            </button>
          </div>
        </>
      )}
    </div>
  );
}
