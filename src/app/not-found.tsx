import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Страницата не е намерена",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="container-page py-24">
      <div className="max-w-lg mx-auto text-center">
        <p className="font-mono text-6xl font-bold text-primary">404</p>

        <h1 className="mt-6 text-3xl sm:text-4xl">Тази страница я няма</h1>

        <p className="mt-4 text-muted-foreground leading-relaxed">
          Възможно е линкът да е стар или заглавието да е свалено от каталога.
          Опитайте от началото или потърсете това, което ви трябва.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <ButtonLink href="/">Към началната страница</ButtonLink>
          <ButtonLink href="/knigi" variant="outline">
            Разгледай книгите
          </ButtonLink>
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          Ако смятате, че това е грешка,{" "}
          <a
            href="/kontakti"
            className="text-primary underline underline-offset-4"
          >
            пишете ни
          </a>
          .
        </p>
      </div>
    </div>
  );
}
