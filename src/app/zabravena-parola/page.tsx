import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "Забравена парола",
  description: "Възстановете достъпа до профила си в Remind Books.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="container-page py-16">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl">Забравена парола</h1>
          <p className="mt-2 text-muted-foreground">
            Въведете имейла си и ще ви изпратим линк за задаване на нова парола.
          </p>
        </div>

        <Card className="p-6 sm:p-8">
          <ForgotPasswordForm />
        </Card>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/vhod"
            className="text-muted-foreground hover:text-primary underline underline-offset-4"
          >
            ← Обратно към входа
          </Link>
        </p>
      </div>
    </div>
  );
}
