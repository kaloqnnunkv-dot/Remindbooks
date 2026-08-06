import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { LoginForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход",
  description: "Влезте в профила си в ReMindBooks.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/profil");

  const params = await searchParams;

  return (
    <div className="container-page py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl">Вход в профила</h1>
          <p className="mt-2 text-muted-foreground">
            Достъп до вашите поръчки, книги и любими заглавия.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <LoginForm
            redirectTo={params.redirect}
            googleEnabled={env.features.googleLogin}
            providerError={params.error}
          />
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Нямате профил?{" "}
          <Link
            href={`/registracia${params.redirect ? `?redirect=${encodeURIComponent(params.redirect)}` : ""}`}
            className="text-primary font-sans font-bold hover:underline underline-offset-4"
          >
            Създайте безплатно
          </Link>
        </p>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Поръчките за физически книги не изискват регистрация.
        </p>
      </div>
    </div>
  );
}
