import type { Metadata } from "next";

import { db } from "@/lib/db";
import { env, isStripeConfigured, isStorageConfigured, isEmailConfigured } from "@/lib/env";
import { isMailerLiteConfigured } from "@/lib/mailerlite";
import { getDefaultLegalContent, LEGAL_META } from "@/lib/legal-content";
import { AdminHeader } from "@/components/admin/admin-ui";
import { SettingsForms } from "@/components/admin/settings-forms";
import { Badge, Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Настройки",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const rows = await db.setting.findMany();
  const settings = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const integrations = [
    {
      name: "Stripe (плащания с карта)",
      ok: isStripeConfigured,
      hint: "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET",
    },
    {
      name: "Хранилище за файлове (S3/R2)",
      ok: isStorageConfigured,
      hint: "S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY",
    },
    {
      name: "Изпращане на имейли (Resend)",
      ok: isEmailConfigured,
      hint: "RESEND_API_KEY",
    },
    {
      name: "MailerLite (бюлетин)",
      ok: isMailerLiteConfigured,
      hint: "MAILERLITE_API_KEY",
    },
    {
      name: "Вход с Google",
      ok: env.features.googleLogin,
      hint: "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET",
    },
  ];

  return (
    <div>
      <AdminHeader
        title="Настройки"
        description="Текстовете на сайта и правните документи. Промените се виждат веднага."
      />

      {/* Състояние на интеграциите */}
      <Card className="p-5 mb-8">
        <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Състояние на връзките
        </h2>

        <ul className="space-y-2.5">
          {integrations.map((item) => (
            <li key={item.name} className="flex flex-wrap items-center gap-3">
              {item.ok ? (
                <Badge tone="success">Свързано</Badge>
              ) : (
                <Badge tone="warning">Не е настроено</Badge>
              )}
              <span className="text-sm">{item.name}</span>
              {!item.ok && (
                <code className="font-mono text-[11px] text-muted-foreground">
                  {item.hint}
                </code>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground leading-relaxed">
          Тези стойности се задават в променливите на средата при хостинг
          доставчика, не оттук — така ключовете никога не попадат в базата данни.
        </p>
      </Card>

      <SettingsForms
        settings={settings}
        legalDefaults={{
          privacy: getDefaultLegalContent("privacy"),
          cookies: getDefaultLegalContent("cookies"),
          terms: getDefaultLegalContent("terms"),
          returns: getDefaultLegalContent("returns"),
        }}
        legalMeta={LEGAL_META}
      />
    </div>
  );
}
