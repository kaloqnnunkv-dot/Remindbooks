import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile, contentTypeFor, signedDownloadUrl } from "@/lib/storage";
import { isStorageConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Стриймва пълния аудио запис.
 *
 * Достъп имат само: безплатното съдържание, притежателите (Entitlement) и
 * администраторите. Ключът към файла никога не се разкрива на клиента.
 *
 * При S3/R2 пренасочваме към подписан временен URL — така файлът се сервира
 * от CDN, а не през сървъра на приложението. При локално хранилище стриймваме
 * сами, с поддръжка на Range заявки (нужни за превъртане в плейъра).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const product = await db.product.findFirst({
    where: { id, type: "AUDIO", isPublished: true },
    select: { id: true, title: true, fileKey: true, isFree: true },
  });

  if (!product?.fileKey) {
    return new NextResponse("Файлът не е намерен.", { status: 404 });
  }

  if (!product.isFree) {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return new NextResponse("Нужен е вход в профила.", { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      const entitlement = await db.entitlement.findUnique({
        where: { userId_productId: { userId, productId: product.id } },
        select: { id: true },
      });
      if (!entitlement) {
        return new NextResponse("Нямате достъп до този запис.", { status: 403 });
      }
    }
  }

  if (isStorageConfigured) {
    const url = await signedDownloadUrl(product.fileKey, 3600);
    return NextResponse.redirect(url, 302);
  }

  return streamLocalFile(request, product.fileKey);
}

/** Стриймване с поддръжка на Range — иначе превъртането в плейъра не работи. */
async function streamLocalFile(request: NextRequest, key: string) {
  const buffer = await readFile(key);
  if (!buffer) return new NextResponse("Файлът не е намерен.", { status: 404 });

  const contentType = contentTypeFor(key);
  const total = buffer.length;
  const range = request.headers.get("range");

  if (range) {
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
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
