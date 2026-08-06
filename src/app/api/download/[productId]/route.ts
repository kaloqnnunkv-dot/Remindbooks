import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile, contentTypeFor, signedDownloadUrl } from "@/lib/storage";
import { isStorageConfigured } from "@/lib/env";
import { slugify } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Сваляне на закупен дигитален продукт (PDF или аудио).
 *
 * Два начина за достъп:
 *  1. Влязъл потребител с Entitlement за продукта.
 *  2. Гост с валиден токен от имейла (?token=…) — за покупки без регистрация.
 *
 * Всяко сваляне се брои, за да може собственикът да забележи злоупотреба
 * (един и същ линк, свален стотици пъти).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const { productId } = await params;
  const token = request.nextUrl.searchParams.get("token");

  const product = await db.product.findFirst({
    where: { id: productId, isPublished: true },
    select: { id: true, title: true, fileKey: true, type: true },
  });

  if (!product?.fileKey) {
    return new NextResponse("Файлът не е намерен.", { status: 404 });
  }

  let authorized = false;

  if (token) {
    const guestToken = await db.guestDownloadToken.findUnique({
      where: { token },
      select: { id: true, productId: true, expires: true },
    });

    if (
      guestToken &&
      guestToken.productId === productId &&
      guestToken.expires > new Date()
    ) {
      authorized = true;
      await db.guestDownloadToken.update({
        where: { id: guestToken.id },
        data: { downloadCount: { increment: 1 } },
      });
    } else {
      return new NextResponse(
        "Линкът за сваляне е изтекъл. Влезте в профила си или се свържете с нас.",
        { status: 403 },
      );
    }
  } else {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.redirect(new URL("/vhod", request.url));
    }

    if (session.user.role === "ADMIN") {
      authorized = true;
    } else {
      const entitlement = await db.entitlement.findUnique({
        where: { userId_productId: { userId, productId } },
        select: { id: true },
      });
      if (entitlement) {
        authorized = true;
        await db.entitlement.update({
          where: { id: entitlement.id },
          data: { downloadCount: { increment: 1 } },
        });
      }
    }
  }

  if (!authorized) {
    return new NextResponse("Нямате достъп до този файл.", { status: 403 });
  }

  const extension = product.fileKey.slice(product.fileKey.lastIndexOf("."));
  const filename = `${slugify(product.title) || "remindbooks"}${extension}`;

  if (isStorageConfigured) {
    const url = await signedDownloadUrl(product.fileKey, 900, filename);
    return NextResponse.redirect(url, 302);
  }

  const buffer = await readFile(product.fileKey);
  if (!buffer) return new NextResponse("Файлът не е намерен.", { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentTypeFor(product.fileKey),
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
