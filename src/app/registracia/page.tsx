import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { RegisterForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Регистрация",
  description: "Създайте профил в ReMindBooks — достъп до закупените книги, история на поръчките и любими заглавия.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/profil");

  const params = await searchParams;

  return (
    <div className="container-page py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl">Създайте профил</h1>
          <p className="mt-2 text-muted-foreground">
            Профилът пази закупените ви книги завинаги и събира любимите ви заглавия.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <RegisterForm
            redirectTo={params.redirect}
            googleEnabled={env.features.googleLogin}
          />
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Вече имате профил?{" "}
          <Link
            href="/vhod"
            className="text-primary font-sans font-bold hover:underline underline-offset-4"
          >
            Влезте
          </Link>
        </p>
      </div>
    </div>
  );
}
