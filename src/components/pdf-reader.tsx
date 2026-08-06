"use client";

import { useState } from "react";
import { Button, ButtonLink, cn } from "./ui";
import { DownloadIcon, CloseIcon, FileTextIcon } from "./icons";

/**
 * Четец за закупени PDF книги.
 *
 * Използва вградения PDF четец на браузъра през <object>. Причината да не се
 * добавя външна библиотека (PDF.js тежи над 1 MB): нативният четец вече има
 * търсене, мащабиране, навигация по страници и печат, работи офлайн след
 * зареждане и се държи еднакво добре на слаби машини.
 *
 * Част от мобилните браузъри (най-вече iOS Safari) отказват да показват PDF
 * във вграден елемент — за тях има резервен вариант с отваряне в нов раздел.
 */
export function PdfReader({
  productId,
  title,
  author,
}: {
  productId: string;
  title: string;
  author?: string | null;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [failed, setFailed] = useState(false);

  const readUrl = `/api/download/${productId}?inline=1`;
  const downloadUrl = `/api/download/${productId}`;

  return (
    <div
      className={cn(
        "flex flex-col",
        fullscreen && "fixed inset-0 z-50 bg-background p-3",
      )}
    >
      {/* Лента с действия */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h1 className="font-sans text-lg font-bold truncate">{title}</h1>
          {author && (
            <p className="text-sm text-muted-foreground truncate">{author}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setFullscreen((v) => !v)}
          >
            {fullscreen ? (
              <>
                <CloseIcon size={15} />
                Затвори
              </>
            ) : (
              "На цял екран"
            )}
          </Button>

          <ButtonLink href={downloadUrl} variant="outline" size="sm">
            <DownloadIcon size={15} />
            Свали
          </ButtonLink>
        </div>
      </div>

      {/* Самият четец */}
      <div
        className={cn(
          "relative border border-border rounded-md overflow-hidden bg-muted",
          fullscreen ? "flex-1" : "h-[78vh]",
        )}
      >
        {!failed ? (
          <object
            data={readUrl}
            type="application/pdf"
            className="w-full h-full"
            aria-label={`Четене на „${title}“`}
            onError={() => setFailed(true)}
          >
            {/* Показва се, когато браузърът няма вграден PDF четец. */}
            <Fallback readUrl={readUrl} downloadUrl={downloadUrl} />
          </object>
        ) : (
          <Fallback readUrl={readUrl} downloadUrl={downloadUrl} />
        )}
      </div>

      {!fullscreen && (
        <p className="mt-3 text-xs text-muted-foreground">
          Книгата е ваша завинаги — може да я четете тук по всяко време или да
          я свалите за офлайн четене.
        </p>
      )}
    </div>
  );
}

function Fallback({
  readUrl,
  downloadUrl,
}: {
  readUrl: string;
  downloadUrl: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <FileTextIcon size={40} className="text-muted-foreground" />
      <div>
        <p className="font-sans font-bold">
          Вашият браузър не може да покаже PDF файла директно
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Отворете книгата в нов раздел или я свалете.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center">
        <ButtonLink href={readUrl} target="_blank" rel="noopener noreferrer">
          Отвори в нов раздел
        </ButtonLink>
        <ButtonLink href={downloadUrl} variant="outline">
          <DownloadIcon size={16} />
          Свали
        </ButtonLink>
      </div>
    </div>
  );
}
