import { NextResponse, type NextRequest } from "next/server";

/**
 * Лека защита на административните и профилните маршрути.
 *
 * Тук се проверява САМО наличието на сесийна бисквитка — не се декодира JWT
 * и не се прави заявка към базата (middleware работи на Edge runtime, където
 * Prisma не е достъпен). Истинската проверка на ролята е в layout-а на /admin,
 * който се изпълнява на сървъра. Целта на middleware-а е да спести
 * ненужно зареждане на страница за очевидно невлезли посетители.
 */

const PROTECTED = ["/admin", "/profil"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const loginUrl = new URL("/vhod", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profil/:path*"],
};
