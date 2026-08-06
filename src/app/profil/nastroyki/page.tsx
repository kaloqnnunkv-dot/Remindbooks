import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileSettingsForms } from "@/components/profile-settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Настройки на профила",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const session = await auth();

  const user = await db.user.findUnique({
    where: { id: session!.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      addressLine: true,
      city: true,
      postalCode: true,
      newsletterOptIn: true,
      passwordHash: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) return null;

  return (
    <div>
      <h1 className="text-3xl rule mb-8">Настройки</h1>

      <ProfileSettingsForms
        user={{
          name: user.name ?? "",
          email: user.email,
          phone: user.phone ?? "",
          addressLine: user.addressLine ?? "",
          city: user.city ?? "",
          postalCode: user.postalCode ?? "",
          newsletterOptIn: user.newsletterOptIn,
          hasPassword: Boolean(user.passwordHash),
          linkedProviders: user.accounts.map((a) => a.provider),
        }}
      />
    </div>
  );
}
