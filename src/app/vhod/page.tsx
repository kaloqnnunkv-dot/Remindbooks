import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { publicUrl } from "@/lib/storage";
import { LoginForm } from "@/components/auth-forms";
import { AuthShell } from "@/components/auth/auth-shell";
import { getSiteImages } from "@/lib/images";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Вход",
  description: "Влезте в профила си в Remind Books.",
  robots: { index: false, follow: false },
};

/** Същият клип като в hero секцията — държи страниците свързани визуално. */
async function getPanelVideo(): Promise<string | null> {
  try {
    const setting = await db.setting.findUnique({ where: { key: "hero_video" } });
    return publicUrl(setting?.value || null);
  } catch {
    return null;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/profil");

  const [params, video, images] = await Promise.all([
    searchParams,
    getPanelVideo(),
    getSiteImages(),
  ]);

  return (
    <AuthShell
      title="Вход в профила"
      subtitle="Достъп до вашите поръчки, книги и любими заглавия."
      video={video}
      logoSrc={images.logo}
      quote="Правилната книга, срещната в правилния момент, връща посоката."
      footer={
        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Нямате профил?{" "}
            <Link
              href={`/registracia${
                params.redirect ? `?redirect=${encodeURIComponent(params.redirect)}` : ""
              }`}
              className="font-sans font-bold text-primary underline-offset-4 hover:underline"
            >
              Създайте безплатно
            </Link>
          </p>
          <p className="text-xs text-muted-foreground">
            Поръчките за физически книги не изискват регистрация.
          </p>
        </div>
      }
    >
      <LoginForm
        redirectTo={params.redirect}
        googleEnabled={env.features.googleLogin}
        providerError={params.error}
      />
    </AuthShell>
  );
}
