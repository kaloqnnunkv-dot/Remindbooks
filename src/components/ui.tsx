import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

// ------------------------------------------------------------------
// Бутон
// ------------------------------------------------------------------

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 font-sans font-bold rounded-md transition-all duration-150 " +
  "disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const VARIANTS = {
  primary:
    "bg-primary text-primary-foreground hover:brightness-95 active:brightness-90 shadow-soft hover:shadow-lift",
  secondary:
    "bg-secondary text-secondary-foreground border border-border hover:bg-accent",
  outline:
    "border border-primary/50 text-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-destructive text-destructive-foreground hover:brightness-95",
  link: "text-primary underline underline-offset-4 hover:brightness-90",
} as const;

const SIZES = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-base",
  icon: "h-9 w-9",
} as const;

type ButtonStyleProps = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
};

export function buttonClass({ variant = "primary", size = "md" }: ButtonStyleProps = {}) {
  return cn(BUTTON_BASE, VARIANTS[variant], SIZES[size]);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ComponentProps<"button"> & ButtonStyleProps) {
  return <button className={cn(buttonClass({ variant, size }), className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & ButtonStyleProps) {
  return <Link className={cn(buttonClass({ variant, size }), className)} {...props} />;
}

// ------------------------------------------------------------------
// Карта, значка, съобщения
// ------------------------------------------------------------------

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-card text-card-foreground border border-border rounded-md",
        className,
      )}
      {...props}
    />
  );
}

const BADGE_TONES = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
  outline: "border border-border text-muted-foreground",
} as const;

export function Badge({
  tone = "default",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof BADGE_TONES }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] font-sans font-bold uppercase tracking-wider",
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: "info" | "success" | "error";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: "bg-muted border-border text-foreground",
    success: "bg-success/12 border-success/40 text-foreground",
    error: "bg-destructive/10 border-destructive/40 text-foreground",
  };
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("border rounded-md px-4 py-3 text-sm", tones[tone], className)}
    >
      {children}
    </div>
  );
}

// ------------------------------------------------------------------
// Форми
// ------------------------------------------------------------------

const FIELD_BASE =
  "w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground " +
  "placeholder:text-muted-foreground/70 transition-colors " +
  "focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/25 " +
  "disabled:opacity-60 aria-[invalid=true]:border-destructive";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(FIELD_BASE, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(FIELD_BASE, "min-h-28 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(FIELD_BASE, "h-10 cursor-pointer", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-xs text-destructive font-sans" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border border-input accent-[var(--primary)] cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

// ------------------------------------------------------------------
// Оформление
// ------------------------------------------------------------------

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl sm:text-4xl rule">{title}</h1>
        {description && (
          <p className="mt-4 text-muted-foreground max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

export function SectionHeading({
  title,
  href,
  linkLabel = "Виж всички",
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-6">
      <h2 className="text-2xl sm:text-3xl">{title}</h2>
      {href && (
        <Link
          href={href}
          className="font-sans text-sm font-bold text-primary hover:underline underline-offset-4 whitespace-nowrap"
        >
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="text-center py-16 px-6 border border-dashed border-border rounded-md bg-card/50">
      {icon && <div className="flex justify-center mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-sans font-bold">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/** Звездичен рейтинг. Ако onRate липсва, е само за показване. */
export function Stars({
  rating,
  size = 14,
  className,
}: {
  rating: number;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`Оценка ${rating.toFixed(1)} от 5`}
      role="img"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={i <= Math.round(rating) ? "text-primary" : "text-border"}
          fill="currentColor"
        >
          <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-t border-border", className)} />;
}

/** Breadcrumb навигация — помага и за SEO. */
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Навигация" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs font-sans text-muted-foreground">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="hover:text-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground font-bold">{item.label}</span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
