import Link from "next/link";
import { env } from "@/lib/env";
import { NewsletterForm } from "./newsletter-form";
import { Logo } from "./logo";
import { FacebookIcon, InstagramIcon, MailIcon, PhoneIcon, TikTokIcon } from "./icons";

const SHOP_LINKS = [
  { href: "/knigi", label: "Физически книги" },
  { href: "/pdf", label: "PDF книги" },
  { href: "/audio", label: "Аудио съдържание" },
  { href: "/podaruchni-karti", label: "Подаръчни карти" },
];

const INFO_LINKS = [
  { href: "/za-nas", label: "За нас" },
  { href: "/blog", label: "Блог „Вътрешен компас“" },
  { href: "/kontakti", label: "Контакти" },
  { href: "/profil", label: "Моят профил" },
];

const LEGAL_LINKS = [
  { href: "/obshti-uslovia", label: "Общи условия" },
  { href: "/poveritelnost", label: "Политика за поверителност" },
  { href: "/biskvitki", label: "Политика за бисквитки" },
  { href: "/vrashtane", label: "Право на отказ и връщане" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 bg-sidebar text-sidebar-foreground border-t border-sidebar-border">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Бранд + бюлетин */}
          <div className="lg:col-span-1">
            <Logo width={160} className="h-10" />
            <p className="mt-3 text-sm text-sidebar-foreground/75 leading-relaxed">
              Книги, които връщат посоката. Истории и практики за вътрешния компас.
            </p>

            <div className="mt-6">
              <h3 className="font-sans text-xs font-bold uppercase tracking-wider mb-3">
                Бюлетин
              </h3>
              <NewsletterForm source="footer" variant="footer" />
            </div>
          </div>

          <FooterColumn title="Магазин" links={SHOP_LINKS} />
          <FooterColumn title="Информация" links={INFO_LINKS} />

          {/* Контакти */}
          <div>
            <h3 className="font-sans text-xs font-bold uppercase tracking-wider mb-4">
              Контакти
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href={`tel:${env.contact.phone.replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-2 text-sidebar-foreground/80 hover:text-sidebar-primary transition-colors"
                >
                  <PhoneIcon size={16} />
                  {env.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${env.contact.email}`}
                  className="inline-flex items-center gap-2 text-sidebar-foreground/80 hover:text-sidebar-primary transition-colors"
                >
                  <MailIcon size={16} />
                  {env.contact.email}
                </a>
              </li>
            </ul>

            <div className="mt-5 flex items-center gap-2">
              <SocialLink href={env.social.facebook} label="Facebook">
                <FacebookIcon size={18} />
              </SocialLink>
              <SocialLink href={env.social.tiktok} label="TikTok">
                <TikTokIcon size={18} />
              </SocialLink>
              {env.social.instagram && (
                <SocialLink href={env.social.instagram} label="Instagram">
                  <InstagramIcon size={18} />
                </SocialLink>
              )}
            </div>
          </div>
        </div>

        {/* Долна лента */}
        <div className="mt-12 pt-6 border-t border-sidebar-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-sidebar-foreground/60">
            © {year} Remind Books. Всички права запазени.
          </p>
          <nav aria-label="Правна информация">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <h3 className="font-sans text-xs font-bold uppercase tracking-wider mb-4">
        {title}
      </h3>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sidebar-foreground/80 hover:text-sidebar-primary transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialLink({
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
      aria-label={label}
      className="h-9 w-9 inline-flex items-center justify-center rounded-md border border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
    >
      {children}
    </a>
  );
}
