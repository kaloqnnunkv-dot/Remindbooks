import { NextResponse, type NextRequest } from "next/server";

import { clearCart } from "@/lib/cart";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Връщането от Stripe.
 *
 * Съществува само за да изчисти кошницата. Next.js позволява писане по
 * бисквитките единствено в Server Action или в маршрут като този — страница не
 * може да ги мени, докато се рисува. Затова Stripe връща клиента тук, а не
 * направо на страницата за успех: тя само показва поръчката.
 *
 * Плащането се потвърждава от webhook-а, не оттук. Този маршрут е достъпен за
 * всеки, който познае адреса, и нарочно не пипа статуса на поръчката.
 */
export async function GET(request: NextRequest) {
  await clearCart();

  const order = request.nextUrl.searchParams.get("order");

  const target = new URL("/checkout/uspeh", env.appUrl);
  if (order) target.searchParams.set("order", order);

  return NextResponse.redirect(target);
}
