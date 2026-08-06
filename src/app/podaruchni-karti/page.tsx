import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env } from "@/lib/env";
import { PageHeader, Card } from "@/components/ui";
import { GiftCardForm } from "@/components/gift-card-form";
import { GiftIcon, MailIcon, TagIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Подаръчни карти",
  description:
    "Подарете книга, без да гадаете коя. Подаръчна карта на Remind Books с код по имейл.",
  alternates: { canonical: "/podaruchni-karti" },
};

export default function GiftCardsPage() {
  // Функционалността е по избор — ако е изключена, страницата не съществува.
  if (!env.features.giftCards) notFound();

  return (
    <div className="container-page py-12">
      <PageHeader
        title="Подаръчни карти"
        description="Най-сигурният начин да подарите книга — оставяте избора на човека, който ще я чете."
      />

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <GiftCardForm />
        </div>

        <aside className="space-y-4">
          <Card className="p-6 bg-muted border-0">
            <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Как работи
            </h2>
            <ol className="space-y-4 text-sm">
              <Step icon={<TagIcon size={16} />} title="Избирате стойност">
                От 10 до 500 лв. — колкото прецените.
              </Step>
              <Step icon={<MailIcon size={16} />} title="Получателят получава имейл">
                С уникален код и вашето лично съобщение.
              </Step>
              <Step icon={<GiftIcon size={16} />} title="Използва кода при плащане">
                За всички книги и аудио съдържание в сайта.
              </Step>
            </ol>
          </Card>

          <Card className="p-6">
            <h2 className="font-sans text-sm font-bold mb-2">Добре е да знаете</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Валидна 12 месеца от датата на покупка.</li>
              <li>• Може да се използва на части — остатъкът се пази.</li>
              <li>• Важи за физически книги, PDF книги и аудио.</li>
              <li>• Не подлежи на осребряване в брой.</li>
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Step({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground">
        {icon}
      </span>
      <span>
        <strong className="block font-sans">{title}</strong>
        <span className="text-muted-foreground">{children}</span>
      </span>
    </li>
  );
}
