import type { Metadata } from "next";

import { env } from "@/lib/env";
import { PageHeader, Card } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import {
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  TikTokIcon,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "Свържете се с нас",
  description:
    "Имате въпрос за поръчка, книга или сътрудничество? Пишете ни — отговаряме лично на всяко съобщение.",
  alternates: { canonical: "/kontakti" },
};

export default function ContactPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Remind Books",
    url: env.appUrl,
    email: env.contact.email,
    telephone: env.contact.phone,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: env.contact.email,
      telephone: env.contact.phone,
      availableLanguage: "Bulgarian",
    },
  };

  return (
    <div className="container-page py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        title="Свържете се с нас"
        description="Въпрос за поръчка, предложение за книга или просто искате да споделите нещо — пишете ни. Отговаряме лично."
      />

      <div className="grid lg:grid-cols-3 gap-10 mt-4">
        {/* Форма */}
        <div className="lg:col-span-2">
          <ContactForm />
        </div>

        {/* Директни контакти */}
        <aside className="space-y-6">
          <Card className="p-6">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Директна връзка
            </h2>

            <ul className="space-y-4">
              <li>
                <a
                  href={`tel:${env.contact.phone.replace(/\s/g, "")}`}
                  className="flex items-start gap-3 group"
                >
                  <span className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md bg-primary/12 text-primary">
                    <PhoneIcon size={17} />
                  </span>
                  <span>
                    <span className="block font-sans text-xs uppercase tracking-wider text-muted-foreground">
                      Телефон
                    </span>
                    <span className="block group-hover:text-primary transition-colors">
                      {env.contact.phone}
                    </span>
                  </span>
                </a>
              </li>

              <li>
                <a
                  href={`mailto:${env.contact.email}`}
                  className="flex items-start gap-3 group"
                >
                  <span className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-md bg-primary/12 text-primary">
                    <MailIcon size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-sans text-xs uppercase tracking-wider text-muted-foreground">
                      Имейл
                    </span>
                    <span className="block break-all group-hover:text-primary transition-colors">
                      {env.contact.email}
                    </span>
                  </span>
                </a>
              </li>
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Социални мрежи
            </h2>
            <div className="flex flex-wrap gap-2">
              <SocialButton href={env.social.facebook} label="Facebook">
                <FacebookIcon size={16} />
              </SocialButton>
              <SocialButton href={env.social.tiktok} label="TikTok">
                <TikTokIcon size={16} />
              </SocialButton>
              {env.social.instagram && (
                <SocialButton href={env.social.instagram} label="Instagram">
                  <InstagramIcon size={16} />
                </SocialButton>
              )}
            </div>
          </Card>

          <Card className="p-6 bg-muted border-0">
            <h2 className="font-sans text-sm font-bold mb-2">Отговаряме бързо</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Обикновено получавате отговор в рамките на един работен ден. За
              въпроси относно вече направена поръчка, посочете номера ѝ.
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function SocialButton({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border font-sans text-xs font-bold hover:border-primary hover:text-primary transition-colors"
    >
      {children}
      {label}
    </a>
  );
}
