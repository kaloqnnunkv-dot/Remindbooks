import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { readFile, contentTypeFor, signedDownloadUrl } from "@/lib/storage";
import { isStorageConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Сервира безплатния откъс (първите страници от PDF или откъс от аудио).
 *
 * Преднамерено публичен — целта на откъса е да се разглежда без вход. Пази се
 * само това, че се сервира previewKey, а не fileKey с пълното съдържание.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const product = await db.product.findFirst({
    where: { id, isPublished: true },
    select: { previewKey: true, title: true },
  });

  if (!product?.previewKey) {
    return new NextResponse("Откъсът не е намерен.", { status: 404 });
  }

  // PDF откъсите се четат от pdf.js в браузъра, за да се разлистват като
  // книга. Затова НЕ пренасочваме към хранилището: то не връща
  // Access-Control-Allow-Origin и четенето през fetch се блокира. Файлът е
  // няколко страници, тъй че подаването му оттук струва малко.
  //
  // Аудио откъсите остават с пренасочване — те тежат и се пускат от <audio>,
  // а той не се съобразява с CORS.
  const isPdf = contentTypeFor(product.previewKey) === "application/pdf";

  if (isStorageConfigured && !isPdf) {
    const url = await signedDownloadUrl(product.previewKey, 3600);
    return NextResponse.redirect(url, 302);
  }

  const buffer = await readFile(product.previewKey);
  if (!buffer) return new NextResponse("Откъсът не е намерен.", { status: 404 });

  const contentType = contentTypeFor(product.previewKey);
  const total = buffer.length;
  const range = request.headers.get("range");

  // Range заявките са нужни за аудио откъсите.
  if (range && contentType.startsWith("audio/")) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? Number(match[1]) : 0;
    const end = match?.[2] ? Number(match[2]) : total - 1;

    if (start >= total || end >= total || start > end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }

    const chunk = buffer.subarray(start, end + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      // Откъсът не се променя често — може да се кешира публично.
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}
