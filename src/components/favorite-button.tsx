"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/favorites";
import { HeartIcon } from "./icons";
import { buttonClass, cn } from "./ui";
import { useToast } from "./toast";

/**
 * Бутон "Добави към любими".
 *
 * Състоянието се обновява оптимистично, за да е мигновено, и се връща назад
 * при отказ от сървъра (например ако сесията е изтекла).
 */
export function FavoriteButton({
  productId,
  initial,
  compact = false,
  className,
}: {
  productId: string;
  initial: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [isFavorite, setIsFavorite] = useState(initial);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  function onClick() {
    const previous = isFavorite;
    setIsFavorite(!previous);

    startTransition(async () => {
      const res = await toggleFavorite(productId);
      if (!res.ok) {
        setIsFavorite(previous);
        toast(res.message, "error");
        if (res.requiresLogin) router.push("/vhod?redirect=" + encodeURIComponent(location.pathname));
        return;
      }
      setIsFavorite(res.isFavorite);
      toast(res.message);
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Премахни от любими" : "Добави към любими"}
        title={isFavorite ? "Премахни от любими" : "Добави към любими"}
        className={cn(
          "h-8 w-8 inline-flex items-center justify-center rounded-full border transition-all",
          isFavorite
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card/90 backdrop-blur-sm text-foreground border-border hover:text-primary hover:border-primary",
          className,
        )}
      >
        <HeartIcon size={16} filled={isFavorite} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={isFavorite}
      className={cn(
        buttonClass({ variant: isFavorite ? "primary" : "outline", size: "lg" }),
        className,
      )}
    >
      <HeartIcon size={18} filled={isFavorite} />
      {isFavorite ? "В любими" : "Добави към любими"}
    </button>
  );
}
