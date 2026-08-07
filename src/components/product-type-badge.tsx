import type { ProductType } from "@prisma/client";
import { BookIcon, FileTextIcon, HeadphonesIcon } from "./icons";
import { cn } from "./ui";

/**
 * Обозначава вида на продукта — хартиена книга, PDF или аудио.
 *
 * Иконата носи основното разпознаване: в кафявата палитра цветовото
 * кодиране би било трудно различимо, докато трите символа се отличават
 * веднага и остават ясни и при черно-бял печат.
 */

const TYPE_META: Record<
  ProductType,
  { label: string; short: string; Icon: typeof BookIcon }
> = {
  PHYSICAL: { label: "Хартиена книга", short: "Хартиена", Icon: BookIcon },
  PDF: { label: "PDF книга", short: "PDF", Icon: FileTextIcon },
  AUDIO: { label: "Аудио", short: "Аудио", Icon: HeadphonesIcon },
};

export function ProductTypeBadge({
  type,
  variant = "overlay",
  short = false,
  className,
}: {
  type: ProductType;
  /** `overlay` ляга върху корицата, `inline` стои в текстов ред. */
  variant?: "overlay" | "inline";
  short?: boolean;
  className?: string;
}) {
  const meta = TYPE_META[type];
  const Icon = meta.Icon;
  const text = short ? meta.short : meta.label;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm font-sans font-bold",
        variant === "overlay"
          ? // Плътен фон — върху корица прозрачността прави текста нечетим.
            "bg-badge-overlay px-2 py-1 text-[11px] text-badge-overlay-foreground shadow-soft"
          : "bg-badge-inline px-2.5 py-1 text-xs text-badge-inline-foreground",
        className,
      )}
    >
      {/* Иконата ползва цвета на текста — кафявото не достига контраст
          върху потъмнения фон. */}
      <Icon size={variant === "overlay" ? 12 : 14} />
      {text}
    </span>
  );
}

/** Текстовото название на вида — за списъци и таблици без икони. */
export function productTypeLabel(type: ProductType): string {
  return TYPE_META[type].label;
}
