import Link from "next/link";
import { env } from "@/lib/env";
import { NewsletterEnvelope } from "./newsletter-envelope";
import { SiteLogo } from "./logo";

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
  { href: "/poveritelnost", label: "Поверителност" },
  { href: "/biskvitki", label: "Бисквитки" },
  { href: "/vrashtane", label: "Право на отказ и връщане" },
];

/**
 * Долната част на всяка страница: бюлетинът с плика и колоните с връзки,
 * както в „Компас на деня“.
 */
export function SiteFooter({ logoSrc }: { logoSrc?: string }) {
  const year = new Date().getFullYear();

  return (
    <div id="kontakti" className="container-page mt-16 sm:mt-24">
      <NewsletterEnvelope source="footer" />

      <footer className="rb-footer">
        <div className="rb-foot">
          <div>
            <SiteLogo src={logoSrc} className="mb-3.5" />
            <p className="m-0 max-w-[34ch] text-[var(--rb-muted)]">
              Книги, които връщат посоката. Истории и практики за вътрешния компас.
            </p>
          </div>

          <FooterColumn title="Магазин" links={SHOP_LINKS} />
          <FooterColumn title="Информация" links={INFO_LINKS} />

          <div>
            <h4>Контакти</h4>
            <ul>
              <li>
                <a href={`tel:${env.contact.phone.replace(/\s/g, "")}`}>{env.contact.phone}</a>
              </li>
              <li>
                <a href={`mailto:${env.contact.email}`}>{env.contact.email}</a>
              </li>
              <li>
                <a href={env.social.facebook} target="_blank" rel="noopener noreferrer">
                  Facebook
                </a>
                ,{" "}
                <a href={env.social.tiktok} target="_blank" rel="noopener noreferrer">
                  TikTok
                </a>
                {env.social.instagram && (
                  <>
                    ,{" "}
                    <a href={env.social.instagram} target="_blank" rel="noopener noreferrer">
                      Instagram
                    </a>
                  </>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="rb-legal">
          <span>© {year} Remind Books. Всички права запазени.</span>
          <nav aria-label="Правна информация">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
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
      <h4>{title}</h4>
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href}>{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
