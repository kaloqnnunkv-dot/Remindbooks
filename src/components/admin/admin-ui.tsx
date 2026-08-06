import Link from "next/link";
import type { ReactNode } from "react";
import { Card, cn } from "../ui";

export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  href,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "default" | "success" | "warning" | "destructive";
}) {
  const tones = {
    default: "",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
  };

  const inner = (
    <Card
      className={cn(
        "p-5 h-full",
        href && "hover:border-primary transition-colors",
      )}
    >
      <p className="font-sans text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 font-sans text-2xl font-bold tabular-nums", tones[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

/** Обвивка за таблица с хоризонтален скрол на тесни екрани. */
export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground bg-muted whitespace-nowrap",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-4 py-3 border-t border-border align-middle", className)}>
      {children}
    </td>
  );
}

export function AdminEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-14 px-6 border border-dashed border-border rounded-md">
      <h3 className="font-sans font-bold">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

/** Хоризонтални табове за филтриране по статус. */
export function AdminTabs({
  tabs,
  current,
  basePath,
}: {
  tabs: { key: string; label: string; count?: number }[];
  current: string;
  basePath: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-6 pb-4 border-b border-border">
      {tabs.map((tab) => {
        const active = current === tab.key;
        const href = tab.key === "all" ? basePath : `${basePath}?status=${tab.key}`;
        return (
          <Link
            key={tab.key}
            href={href}
            className={cn(
              "px-3.5 py-1.5 rounded-md font-sans text-xs font-bold transition-colors border",
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary hover:text-primary",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="ml-1.5 opacity-70">{tab.count}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
