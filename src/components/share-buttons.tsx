"use client";

import { useState } from "react";
import { FacebookIcon, LinkIcon, ShareIcon, CheckIcon } from "./icons";
import { useToast } from "./toast";
import { publicConfig } from "@/lib/public-config";

/**
 * Бутони за споделяне — Facebook, нативно споделяне (мобилни) и копиране на линк.
 * Спецификацията изисква Facebook + копиране на линк като минимум.
 */
export function ShareButtons({
  path,
  title,
  className,
}: {
  path: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // На сървъра location липсва — сглобяваме URL от конфигурацията.
  const url =
    typeof window !== "undefined"
      ? window.location.href
      : `${publicConfig.appUrl}${path}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast("Линкът е копиран.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Копирането не бе успешно.", "error");
    }
  }

  async function nativeShare() {
    if (!navigator.share) return copyLink();
    try {
      await navigator.share({ title, url });
    } catch {
      // Потребителят е отказал споделянето — не е грешка.
    }
  }

  const btn =
    "h-9 px-3 inline-flex items-center gap-2 rounded-md border border-border text-xs font-sans font-bold hover:bg-muted transition-colors";

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <span className="text-xs font-sans uppercase tracking-wider text-muted-foreground mr-1">
        Сподели
      </span>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={btn}
        aria-label="Сподели във Facebook"
      >
        <FacebookIcon size={15} />
        Facebook
      </a>

      <button type="button" onClick={copyLink} className={btn} aria-label="Копирай линк">
        {copied ? <CheckIcon size={15} /> : <LinkIcon size={15} />}
        {copied ? "Копиран" : "Копирай линк"}
      </button>

      <button
        type="button"
        onClick={nativeShare}
        className={`${btn} sm:hidden`}
        aria-label="Сподели"
      >
        <ShareIcon size={15} />
        Още
      </button>
    </div>
  );
}
