"use client";

import type { ComponentProps } from "react";
import { cn } from "../ui";

/**
 * Бутон с пробягваща светлина при посочване.
 *
 * Наклонената ивица минава отляво надясно чрез `transform`, а не чрез промяна
 * на позиция — така анимацията върви на графичния процесор и не предизвиква
 * преизчисляване на оформлението.
 */
export function ShineButton({
  className,
  children,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "group/shine relative inline-flex h-12 w-full items-center justify-center overflow-hidden",
        "rounded-md bg-primary font-sans text-sm font-bold text-primary-foreground",
        "shadow-soft transition-all duration-300 ease-in-out",
        "hover:shadow-lift hover:brightness-105",
        "disabled:pointer-events-none disabled:opacity-60",
        className,
      )}
      {...props}
    >
      <span className="relative z-10">{children}</span>

      <span
        aria-hidden="true"
        className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/shine:duration-1000 group-hover/shine:[transform:skew(-13deg)_translateX(100%)] motion-reduce:hidden"
      >
        <span className="relative h-full w-10 bg-white/25" />
      </span>
    </button>
  );
}
