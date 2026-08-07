"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { saveBundle, type AdminState } from "@/app/actions/admin-products";
import { formatPrice } from "@/lib/format";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Field,
  Input,
  Textarea,
  cn,
} from "../ui";

const initialState: AdminState = { ok: false, message: "" };

export type BundleFormData = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  price: string;
  isPublished: boolean;
  coverUrl: string | null;
  productIds: string[];
};

type PhysicalProduct = {
  id: string;
  title: string;
  priceCents: number;
  coverImage: string | null;
};

export function BundleForm({
  bundle,
  products,
}: {
  bundle?: BundleFormData;
  products: PhysicalProduct[];
}) {
  const [state, action, pending] = useActionState(saveBundle, initialState);
  const [selected, setSelected] = useState<string[]>(bundle?.productIds ?? []);
  const [price, setPrice] = useState(bundle?.price ?? "");
  const [coverPreview, setCoverPreview] = useState<string | null>(
    bundle?.coverUrl ?? null,
  );

  // Сборната цена показва на собственика каква отстъпка реално дава.
  const fullPriceCents = products
    .filter((p) => selected.includes(p.id))
    .reduce((sum, p) => sum + p.priceCents, 0);

  const bundlePriceCents = Math.round(
    (Number(price.replace(",", ".")) || 0) * 100,
  );
  const savings = fullPriceCents - bundlePriceCents;

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <form action={action} className="space-y-6">
      {bundle?.id && <input type="hidden" name="id" value={bundle.id} />}
      {selected.map((id) => (
        <input key={id} type="hidden" name="productIds" value={id} />
      ))}

      <Card className="p-6 space-y-4">
        <h2 className="font-sans text-lg font-bold">Основна информация</h2>

        <Field label="Заглавие" htmlFor="bn-title" required error={state.errors?.title}>
          <Input
            id="bn-title"
            name="title"
            defaultValue={bundle?.title}
            required
            maxLength={200}
            placeholder="напр. Комплект „Първи стъпки“"
          />
        </Field>

        <Field
          label="Описание"
          htmlFor="bn-desc"
          required
          error={state.errors?.description}
        >
          <Textarea
            id="bn-desc"
            name="description"
            defaultValue={bundle?.description}
            required
            rows={4}
            maxLength={5000}
          />
        </Field>

        <Field
          label="URL адрес (slug)"
          htmlFor="bn-slug"
          hint="Празно = автоматично от заглавието."
        >
          <Input
            id="bn-slug"
            name="slug"
            defaultValue={bundle?.slug}
            maxLength={100}
            className="font-mono text-xs"
          />
        </Field>
      </Card>

      {/* Съдържание на комплекта */}
      <Card className="p-6">
        <h2 className="font-sans text-lg font-bold mb-1">Книги в комплекта</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Изберете поне 2 физически книги. Дигиталните заглавия не могат да
          участват в комплект с доставка.
        </p>

        {products.length === 0 ? (
          <Alert tone="error">
            Няма налични физически книги. Първо добавете поне две.
          </Alert>
        ) : (
          <div className="max-h-80 overflow-y-auto border border-border rounded-md divide-y divide-border">
            {products.map((p) => {
              const checked = selected.includes(p.id);
              return (
                <label
                  key={p.id}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                    checked ? "bg-primary/5" : "hover:bg-muted",
                  )}
                >
                  <Checkbox checked={checked} onChange={() => toggle(p.id)} />

                  <div className="relative w-8 h-11 shrink-0 bg-muted rounded-sm overflow-hidden border border-border">
                    {p.coverImage && (
                      <Image
                        src={p.coverImage}
                        alt=""
                        fill
                        sizes="32px"
                        className="object-contain"
                      />
                    )}
                  </div>

                  <span className="flex-1 text-sm truncate">{p.title}</span>
                  <span className="font-sans text-sm font-bold whitespace-nowrap">
                    {formatPrice(p.priceCents)}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {state.errors?.productIds && (
          <p className="mt-2 text-xs text-destructive">{state.errors.productIds}</p>
        )}

        {selected.length > 0 && (
          <p className="mt-3 text-sm text-muted-foreground">
            Избрани {selected.length}{" "}
            {selected.length === 1 ? "заглавие" : "заглавия"} · сборна цена{" "}
            <strong className="text-foreground">{formatPrice(fullPriceCents)}</strong>
          </p>
        )}
      </Card>

      {/* Цена */}
      <Card className="p-6 space-y-4">
        <h2 className="font-sans text-lg font-bold">Цена на комплекта</h2>

        <div className="max-w-xs">
          <Field
            label="Цена (лв.)"
            htmlFor="bn-price"
            required
            error={state.errors?.priceCents}
          >
            <Input
              id="bn-price"
              name="priceCents"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              inputMode="decimal"
              className="font-mono"
              placeholder="0.00"
            />
          </Field>
        </div>

        {selected.length > 0 && bundlePriceCents > 0 && (
          <div
            className={cn(
              "p-4 rounded-md text-sm",
              savings > 0
                ? "bg-success/10 border border-success/40"
                : "bg-destructive/10 border border-destructive/40",
            )}
          >
            {savings > 0 ? (
              <>
                Клиентът спестява{" "}
                <strong>{formatPrice(savings)}</strong> (
                {Math.round((savings / fullPriceCents) * 100)}%) спрямо
                купуването поотделно.
              </>
            ) : (
              <>
                Внимание: цената на комплекта е по-висока или равна на сбора от
                отделните книги ({formatPrice(fullPriceCents)}). Клиентът няма
                причина да го избере.
              </>
            )}
          </div>
        )}
      </Card>

      {/* Корица */}
      <Card className="p-6">
        <h2 className="font-sans text-lg font-bold mb-4">Изображение</h2>

        <div className="flex items-start gap-4">
          {coverPreview && (
            <div className="relative w-32 h-20 shrink-0 bg-muted rounded-sm overflow-hidden border border-border">
              <Image
                src={coverPreview}
                alt="Преглед"
                fill
                sizes="128px"
                className="object-contain"
                unoptimized={coverPreview.startsWith("blob:")}
              />
            </div>
          )}

          <div className="flex-1">
            <input
              id="bn-cover"
              name="coverFile"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setCoverPreview(URL.createObjectURL(file));
              }}
              className="block w-full text-sm file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-border file:bg-secondary file:text-secondary-foreground file:font-sans file:text-xs file:font-bold hover:file:bg-accent file:cursor-pointer"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Снимка на книгите заедно. Препоръчително съотношение 3:2.
            </p>
            {state.errors?.coverFile && (
              <p className="mt-1 text-xs text-destructive">{state.errors.coverFile}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            name="isPublished"
            defaultChecked={bundle?.isPublished ?? false}
            className="mt-0.5"
          />
          <span>
            <span className="block font-sans text-sm font-bold">Публикуван</span>
            <span className="block text-xs text-muted-foreground">
              Показва се в дъното на страницата с физически книги.
            </span>
          </span>
        </label>
      </Card>

      {state.message && (
        <Alert tone={state.ok ? "success" : "error"}>{state.message}</Alert>
      )}

      <div className="flex flex-wrap items-center gap-3 sticky bottom-0 py-4 bg-background border-t border-border">
        <Button type="submit" size="lg" disabled={pending || products.length < 2}>
          {pending ? "Запазване…" : bundle?.id ? "Запази промените" : "Създай комплект"}
        </Button>
        <ButtonLink href="/admin/komplekti" variant="ghost">
          Отказ
        </ButtonLink>
      </div>
    </form>
  );
}
