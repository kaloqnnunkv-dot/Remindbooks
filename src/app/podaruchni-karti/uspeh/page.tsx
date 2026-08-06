import type { Metadata } from "next";
import { ButtonLink, Card } from "@/components/ui";
import { CheckIcon, MailIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Подаръчната карта е изпратена",
  robots: { index: false, follow: false },
};

export default function GiftCardSuccessPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-xl mx-auto text-center">
        <div className="mx-auto h-16 w-16 rounded-full bg-success/15 text-success flex items-center justify-center">
          <CheckIcon size={32} />
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl">Подаръкът е на път</h1>

        <p className="mt-3 text-muted-foreground leading-relaxed">
          Плащането е успешно. Изпращаме подаръчната карта на посочения имейл
          заедно с вашето съобщение.
        </p>

        <Card className="mt-8 p-6 bg-muted border-0 text-left">
          <p className="flex items-start gap-2.5 text-sm">
            <MailIcon size={18} className="text-primary shrink-0 mt-0.5" />
            <span>
              Ако получателят не види имейла до няколко минути, нека провери
              папка „Спам“. При проблем ни пишете и ще изпратим кода отново.
            </span>
          </p>
        </Card>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <ButtonLink href="/knigi">Разгледай книгите</ButtonLink>
          <ButtonLink href="/podaruchni-karti" variant="outline">
            Още една карта
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
