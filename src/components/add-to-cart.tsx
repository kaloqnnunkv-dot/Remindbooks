"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import type { ProductType } from "@prisma/client";
import { addToCart, addBundleToCart } from "@/app/actions/cart";
import { Button, buttonClass, cn } from "./ui";
import { CartIcon, CheckIcon, MinusIcon, PlusIcon } from "./icons";
import { useToast } from "./toast";

export function AddToCartButton({
  productId,
  type,
  isFree,
  disabled,
  slug,
  size = "md",
  fullWidth,
  quantity = 1,
}: {
  productId: string;
  type: ProductType;
  isFree?: boolean;
  disabled?: boolean;
  slug: string;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  quantity?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Безплатното аудио не се купува — води директно към страницата за слушане.
  if (isFree) {
    return (
      <a
        href={`/audio/${slug}`}
        className={cn(buttonClass({ size, variant: "primary" }), fullWidth && "w-full")}
      >
        Слушай сега
      </a>
    );
  }

  function onClick() {
    startTransition(async () => {
      const res = await addToCart(productId, quantity);
      toast(res.message, res.ok ? "success" : "error");
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
        router.refresh();
      }
    });
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled || pending}
      size={size}
      className={cn(fullWidth && "w-full")}
      aria-label={disabled ? "Изчерпана наличност" : "Добави в кошницата"}
    >
      {added ? (
        <>
          <CheckIcon size={size === "sm" ? 14 : 18} />
          {size !== "sm" && "Добавена"}
        </>
      ) : (
        <>
          <CartIcon size={size === "sm" ? 14 : 18} />
          {size !== "sm" && (disabled ? "Изчерпана" : "Купи")}
        </>
      )}
    </Button>
  );
}

export function AddBundleButton({
  bundleId,
  fullWidth,
}: {
  bundleId: string;
  fullWidth?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  return (
    <Button
      disabled={pending}
      className={cn(fullWidth && "w-full")}
      onClick={() =>
        startTransition(async () => {
          const res = await addBundleToCart(bundleId);
          toast(res.message, res.ok ? "success" : "error");
          if (res.ok) router.refresh();
        })
      }
    >
      <CartIcon size={18} />
      Купи комплекта
    </Button>
  );
}

/** Избор на количество — само за физически книги. */
export function QuantityPicker({
  value,
  onChange,
  max = 20,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center border border-input rounded-md bg-card">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={disabled || value <= 1}
        aria-label="Намали количеството"
        className="h-10 w-10 inline-flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:pointer-events-none rounded-l-md"
      >
        <MinusIcon size={16} />
      </button>
      <span
        className="w-12 text-center font-sans text-sm font-bold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="Увеличи количеството"
        className="h-10 w-10 inline-flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:pointer-events-none rounded-r-md"
      >
        <PlusIcon size={16} />
      </button>
    </div>
  );
}

/** Комбинация количество + бутон, за страницата на физическа книга. */
export function BuyBox({
  productId,
  type,
  slug,
  stock,
  disabled,
}: {
  productId: string;
  type: ProductType;
  slug: string;
  stock: number;
  disabled?: boolean;
}) {
  const [qty, setQty] = useState(1);
  const isPhysical = type === "PHYSICAL";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {isPhysical && !disabled && (
        <QuantityPicker
          value={qty}
          onChange={setQty}
          max={Math.min(stock, 20)}
          disabled={disabled}
        />
      )}
      <AddToCartButton
        productId={productId}
        type={type}
        slug={slug}
        size="lg"
        quantity={qty}
        disabled={disabled}
        fullWidth={!isPhysical}
      />
    </div>
  );
}
