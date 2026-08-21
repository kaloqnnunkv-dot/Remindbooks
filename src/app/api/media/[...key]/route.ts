import { NextResponse } from "next/server";
import { readFile, contentTypeFor } from "@/lib/storage";
import { isStorageConfigured } from "@/lib/env";

/**
 * Сервира публични файлове (корици, снимки от блога) в локален режим —
 * когато няма конфигуриран S3/R2 и няма CDN домейн.
 *
 * Достъпни са само папките с публично съдържание. Ключовете към PDF и аудио
 * файлове минават през /api/download и /api/audio, където се проверява достъп.
 */

// `site` са снимките от оформлението, подменяни от админ панела — публични са
// по същия начин, по който са и кориците.
const PUBLIC_FOLDERS = ["covers", "blog", "site"];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  // При конфигуриран CDN тези URL-и изобщо не се генерират.
  if (isStorageConfigured && process.env.NEXT_PUBLIC_MEDIA_HOST) {
    return new NextResponse("Не се използва.", { status: 404 });
  }

  const { key } = await params;
  const joined = key.join("/");

  // Защита срещу излизане от папката за качвания.
  if (joined.includes("..") || joined.startsWith("/")) {
    return new NextResponse("Невалиден път.", { status: 400 });
  }

  const folder = key[0];
  if (!folder || !PUBLIC_FOLDERS.includes(folder)) {
    return new NextResponse("Нямате достъп.", { status: 403 });
  }

  const buffer = await readFile(joined);
  if (!buffer) return new NextResponse("Файлът не е намерен.", { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypeFor(joined),
      "Content-Length": String(buffer.length),
      // Ключовете съдържат UUID — при смяна на файла се сменя и URL-ът.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
