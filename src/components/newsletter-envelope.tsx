"use client";

import { useState } from "react";
import { cn } from "./ui";

/**
 * Бюлетинът „Останете свързани“ с плика, който се затваря и изпраща писмото,
 * щом абонаментът мине. Записва през същия `/api/newsletter` като
 * `NewsletterForm`.
 */
export function NewsletterEnvelope({ source = "footer" }: { source?: string }) {
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

  return (
    <div className="rb-news glass">
      <div className={cn("rb-env", status === "ok" && "sent")} aria-hidden="true">
        <div className="letter" />
        <div className="bodyE" />
        <div className="flap" />
      </div>
      <div>
        <h2 className="rb-sec" style={{ marginTop: 0 }}>
          Останете свързани
        </h2>
        <p className="rb-lead">
          Нови заглавия, откъси и мисли от блога — веднъж месечно, право във вашата поща.
        </p>
        {status !== "ok" && (
          <form onSubmit={onSubmit} noValidate>
            <label htmlFor={`newsletter-${source}`} className="sr-only">
              Имейл адрес
            </label>
            <input
              id={`newsletter-${source}`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Имейл адрес"
              required
              autoComplete="email"
              disabled={status === "loading"}
              aria-invalid={status === "error"}
            />
            <button className="btn main" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Изпращане…" : "Абонирай ме"}
            </button>
          </form>
        )}
        <small role="status">
          {status === "ok" ? (
            <span className="rb-ok">{message}</span>
          ) : status === "error" && message ? (
            <span className="rb-err">{message}</span>
          ) : (
            "Без спам. Отписване по всяко време."
          )}
        </small>
      </div>
    </div>
  );
}
