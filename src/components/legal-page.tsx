import Link from "next/link";
import { LEGAL_META } from "@/lib/legal-content";
import { Breadcrumbs } from "./ui";

const LEGAL_NAV = Object.values(LEGAL_META);

/**
 * Обща обвивка за правните страници — еднакво оформление и странична
 * навигация между четирите документа.
 */
export function LegalPage({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="container-page py-12">
      <div className="grid lg:grid-cols-4 gap-12">
        <div className="lg:col-span-3 max-w-3xl">
          <Breadcrumbs items={[{ label: "Начало", href: "/" }, { label: title }]} />

          <h1 className="text-3xl sm:text-4xl rule mb-8">{title}</h1>

          <div
            className="prose-rmb text-[15px]"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>

        <aside className="lg:col-span-1">
          <nav
            className="lg:sticky lg:top-24 p-5 bg-muted rounded-md"
            aria-label="Правни документи"
          >
            <h2 className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Правна информация
            </h2>
            <ul className="space-y-2">
              {LEGAL_NAV.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/${page.slug}`}
                    className={`block text-sm transition-colors ${
                      page.title === title
                        ? "text-primary font-bold"
                        : "text-muted-foreground hover:text-primary"
                    }`}
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </div>
    </div>
  );
}
