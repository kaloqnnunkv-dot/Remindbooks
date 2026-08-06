import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { formatPrice, BG_ORDER_STATUS } from "@/lib/format";
import { clearCart } from "@/lib/cart";
import { Card, ButtonLink, Badge, Alert } from "@/components/ui";
import { statusTone } from "@/lib/order-status";
import { CheckIcon, DownloadIcon, MailIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Благодарим за поръчката",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; session_id?: string }>;
}) {
  const params = await searchParams;

  // Кошницата се изчиства при връщане от Stripe. Плащането обаче се потвърждава
  // САМО от webhook-а — тази страница не променя статуса на поръчката.
  await clearCart();

  const order = params.order
    ? await db.order.findUnique({
        where: { orderNumber: params.order },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          email: true,
          totalCents: true,
          fulfillmentType: true,
          paymentMethod: true,
          userId: true,
          paidAt: true,
          items: {
            select: {
              titleSnapshot: true,
              typeSnapshot: true,
              quantity: true,
              unitCents: true,
              productId: true,
            },
          },
        },
      })
    : null;

  const session = await auth();
  const isOwner =
    order && (!order.userId || order.userId === session?.user?.id);

  const digitalItems =
    order?.items.filter(
      (i) => i.typeSnapshot === "PDF" || i.typeSnapshot === "AUDIO",
    ) ?? [];

  return (
    <div className="container-page py-16">
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-success/15 text-success flex items-center justify-center">
            <CheckIcon size={32} />
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl">Благодарим за поръчката!</h1>

          {order ? (
            <p className="mt-3 text-muted-foreground">
              Поръчка{" "}
              <span className="font-mono font-bold text-foreground">
                {order.orderNumber}
              </span>{" "}
              е приета. Изпратихме потвърждение на{" "}
              <span className="font-bold text-foreground">{order.email}</span>.
            </p>
          ) : (
            <p className="mt-3 text-muted-foreground">
              Поръчката ви е приета. Скоро ще получите имейл с потвърждение.
            </p>
          )}
        </div>

        {order && isOwner && (
          <>
            {/* Плащането се потвърждава асинхронно от Stripe webhook-а. */}
            {order.status === "PENDING" && order.paymentMethod === "CARD" && (
              <Alert className="mt-8">
                Обработваме плащането. Това отнема няколко секунди — ще получите
                имейл веднага щом бъде потвърдено.
              </Alert>
            )}

            <Card className="mt-8 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="font-sans text-lg font-bold">Детайли</h2>
                <Badge tone={statusTone(order.status)}>
                  {BG_ORDER_STATUS[order.status]}
                </Badge>
              </div>

              <ul className="space-y-3">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between gap-4 text-sm">
                    <span>
                      {item.titleSnapshot}
                      {item.quantity > 1 && (
                        <span className="text-muted-foreground"> × {item.quantity}</span>
                      )}
                    </span>
                    <span className="font-sans font-bold whitespace-nowrap">
                      {formatPrice(item.unitCents * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-border flex justify-between font-sans font-bold">
                <span>Общо</span>
                <span>{formatPrice(order.totalCents)}</span>
              </div>
            </Card>

            {/* Дигитално съдържание */}
            {digitalItems.length > 0 && (
              <Card className="mt-4 p-6 bg-muted border-0">
                <h2 className="flex items-center gap-2 font-sans text-lg font-bold mb-3">
                  <DownloadIcon size={20} className="text-primary" />
                  Вашето дигитално съдържание
                </h2>

                {order.paidAt ? (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">
                      Съдържанието е отключено. Изпратихме линкове и на имейла ви.
                    </p>
                    {session?.user ? (
                      <ButtonLink href="/profil/moite-knigi">
                        Към моите книги
                      </ButtonLink>
                    ) : (
                      <div className="space-y-3">
                        <p className="flex items-start gap-2 text-sm">
                          <MailIcon size={16} className="text-primary shrink-0 mt-0.5" />
                          Проверете пощата си за линковете за сваляне.
                        </p>
                        <ButtonLink href="/registracia" variant="outline">
                          Създайте профил за постоянен достъп
                        </ButtonLink>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Съдържанието ще бъде отключено веднага след потвърждаване на
                    плащането.
                  </p>
                )}
              </Card>
            )}

            {/* Физическа доставка */}
            {order.fulfillmentType === "SHIPPING" && (
              <Card className="mt-4 p-6 bg-muted border-0">
                <h2 className="font-sans text-lg font-bold mb-2">Какво следва</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ще подготвим поръчката ви и ще я предадем на куриер. Ще получите
                  имейл с номер за проследяване веднага щом бъде изпратена.
                  Стандартният срок за доставка е 2-4 работни дни.
                </p>
              </Card>
            )}
          </>
        )}

        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          <ButtonLink href="/knigi">Продължи с пазаруването</ButtonLink>
          {session?.user && (
            <ButtonLink href="/profil/porachki" variant="outline">
              Моите поръчки
            </ButtonLink>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Имате въпрос?{" "}
          <Link
            href="/kontakti"
            className="text-primary underline underline-offset-4"
          >
            Свържете се с нас
          </Link>
        </p>
      </div>
    </div>
  );
}
