import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth-forms";
import { Card, Alert, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Нова парола",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="container-page py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl">Задайте нова парола</h1>
        </div>

        <Card className="p-6 sm:p-8">
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4">
              <Alert tone="error">
                Липсва валиден линк за смяна на паролата. Моля, заявете нов.
              </Alert>
              <ButtonLink href="/zabravena-parola" className="w-full">
                Заяви нов линк
              </ButtonLink>
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/vhod"
            className="text-muted-foreground hover:text-primary underline underline-offset-4"
          >
            ← Обратно към входа
          </Link>
        </p>
      </div>
    </div>
  );
}
