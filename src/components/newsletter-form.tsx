"use client";

import { useState } from "react";
import { Button, Input } from "./ui";

/**
 * Форма за абонамент за бюлетина.
 * Използва се на началната страница и във footer-а (variant="footer").
 */
export function NewsletterForm({
  source = "homepage",
  variant = "default",
}: {
  source?: string;
  variant?: "default" | "footer";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };

      setStatus(data.ok ? "ok" : "error");
      setMessage(data.message);
      if (data.ok) setEmail("");
    } catch {
      setStatus("error");
      setMessage("Възникна грешка. Моля, опитайте отново.");
    }
  }

  if (status === "ok") {
    return (
      <p
        className={`text-sm ${variant === "footer" ? "text-sidebar-foreground/80" : "text-foreground"}`}
        role="status"
      >
        ✓ {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2" noValidate>
      <div className="flex flex-col sm:flex-row gap-2">
        <label htmlFor={`newsletter-${source}`} className="sr-only">
          Имейл адрес
        </label>
        <Input
          id={`newsletter-${source}`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="вашият@имейл.bg"
          required
          autoComplete="email"
          disabled={status === "loading"}
          aria-invalid={status === "error"}
          className="flex-1"
        />
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Изпращане…" : "Абонирай ме"}
        </Button>
      </div>

      {status === "error" && message && (
        <p className="text-xs text-destructive" role="alert">
          {message}
        </p>
      )}

      <p
        className={`text-xs ${variant === "footer" ? "text-sidebar-foreground/60" : "text-muted-foreground"}`}
      >
        Без спам. Отписване по всяко време.
      </p>
    </form>
  );
}
