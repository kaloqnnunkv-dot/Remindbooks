"use client";

import { useState, useTransition } from "react";
import { checkPromoCode, checkGiftCard } from "@/app/actions/checkout";
import { Button, Input } from "./ui";
import { CheckIcon, CloseIcon, TagIcon, GiftIcon } from "./icons";

/**
 * Поле за промо код с проверка на живо.
 *
 * Кодът се валидира на сървъра още преди подаване на формата, за да не
 * научава потребителят чак накрая, че кодът е изтекъл.
 */
export function PromoField({
  onApplied,
}: {
  onApplied: (code: string | null, discountCents: number) => void;
}) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function apply() {
    startTransition(async () => {
      const res = await checkPromoCode(code);
      setMessage(res.message);
      setError(!res.ok);
      if (res.ok && res.code) {
        setApplied(res.code);
        onApplied(res.code, res.discountCents);
      }
    });
  }

  function clear() {
    setApplied(null);
    setCode("");
    setMessage("");
    setError(false);
    onApplied(null, 0);
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-success/10 border border-success/40 rounded-md">
        <span className="flex items-center gap-2 text-sm">
          <CheckIcon size={16} className="text-success" />
          <span className="font-mono font-bold">{applied}</span>
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Премахни промо кода"
        >
          <CloseIcon size={16} />
        </button>
        <input type="hidden" name="promoCode" value={applied} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="promo-code"
        className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        <TagIcon size={14} />
        Промо код
      </label>
      <div className="flex gap-2">
        <Input
          id="promo-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Въведете код"
          className="flex-1 font-mono uppercase"
          autoComplete="off"
          onKeyDown={(e) => {
            // Enter в това поле не бива да изпраща цялата поръчка.
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={apply}
          disabled={pending || !code.trim()}
        >
          {pending ? "…" : "Приложи"}
        </Button>
      </div>
      {message && (
        <p className={`text-xs ${error ? "text-destructive" : "text-success"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export function GiftCardField({
  onApplied,
}: {
  onApplied: (code: string | null, balanceCents: number) => void;
}) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function apply() {
    startTransition(async () => {
      const res = await checkGiftCard(code);
      setMessage(res.message);
      setError(!res.ok);
      if (res.ok && res.code) {
        setApplied(res.code);
        onApplied(res.code, res.balanceCents);
      }
    });
  }

  function clear() {
    setApplied(null);
    setCode("");
    setMessage("");
    setError(false);
    onApplied(null, 0);
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 p-3 bg-success/10 border border-success/40 rounded-md">
        <span className="flex items-center gap-2 text-sm">
          <GiftIcon size={16} className="text-success" />
          <span className="font-mono font-bold">{applied}</span>
        </span>
        <button
          type="button"
          onClick={clear}
          className="text-muted-foreground hover:text-destructive"
          aria-label="Премахни подаръчната карта"
        >
          <CloseIcon size={16} />
        </button>
        <input type="hidden" name="giftCardCode" value={applied} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label
        htmlFor="gift-card"
        className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        <GiftIcon size={14} />
        Подаръчна карта
      </label>
      <div className="flex gap-2">
        <Input
          id="gift-card"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="RMB-XXXX-XXXX"
          className="flex-1 font-mono uppercase"
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
        />
        <Button
          type="button"
          variant="secondary"
          onClick={apply}
          disabled={pending || !code.trim()}
        >
          {pending ? "…" : "Приложи"}
        </Button>
      </div>
      {message && (
        <p className={`text-xs ${error ? "text-destructive" : "text-success"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
