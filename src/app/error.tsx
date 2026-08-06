"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui";

/**
 * Резервна страница при неочаквана грешка.
 * Не показва техническите детайли на посетителя — те отиват в конзолата/логовете.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Необработена грешка:", error);
  }, [error]);

  return (
    <div className="container-page py-24">
      <div className="max-w-lg mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl">Нещо се обърка</h1>

        <p className="mt-4 text-muted-foreground leading-relaxed">
          Възникна неочаквана грешка. Опитайте отново — ако проблемът се повтори,
          моля, свържете се с нас.
        </p>

        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Button onClick={reset}>Опитай отново</Button>
          <ButtonLink href="/" variant="outline">
            Към началната страница
          </ButtonLink>
        </div>

        {error.digest && (
          <p className="mt-8 font-mono text-xs text-muted-foreground">
            Код на грешката: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
