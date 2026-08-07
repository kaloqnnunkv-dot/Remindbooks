"use client";

import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import { cn } from "../ui";

/**
 * Поле с движеща се светлина по горния и долния ръб.
 *
 * Светлината следва курсора само по хоризонталата — вертикалната позиция е
 * закована към ръбовете, което дава усещане за плъзгащ се отблясък, без да
 * разсейва при писане.
 *
 * Ефектът е чисто украса: изключва се при „намалено движение“ и не пречи на
 * работата на полето.
 */
export function GlowInput({
  label,
  error,
  icon,
  className,
  id,
  ...props
}: ComponentProps<"input"> & {
  label?: string;
  error?: string;
  icon?: ReactNode;
}) {
  const [x, setX] = useState(0);
  const [hovering, setHovering] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground"
        >
          {label}
        </label>
      )}

      <div
        ref={wrapperRef}
        className="relative w-full"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setX(e.clientX - rect.left);
        }}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      >
        <input
          id={id}
          className={cn(
            "peer relative z-10 h-12 w-full rounded-md border-2 border-input bg-card px-4",
            "text-foreground outline-none transition-all duration-200 ease-in-out",
            "placeholder:text-muted-foreground/70",
            "focus:border-ring focus:ring-2 focus:ring-ring/20",
            "disabled:opacity-60",
            error && "border-destructive",
            // Boolean(), защото ReactNode може да е числото 0, което `cn` не приема.
            Boolean(icon) && "pr-11",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />

        {/* Отблясъкът стои над полето, но не приема събития от мишката. */}
        {hovering && (
          <span aria-hidden="true" className="motion-reduce:hidden">
            <span
              className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[2px] rounded-t-md"
              style={{
                background: `radial-gradient(30px circle at ${x}px 0px, var(--auth-glow) 0%, transparent 70%)`,
              }}
            />
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[2px] rounded-b-md"
              style={{
                background: `radial-gradient(30px circle at ${x}px 2px, var(--auth-glow) 0%, transparent 70%)`,
              }}
            />
          </span>
        )}

        {icon && (
          <span className="absolute right-3 top-1/2 z-20 -translate-y-1/2 text-muted-foreground">
            {icon}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-1.5 font-sans text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
