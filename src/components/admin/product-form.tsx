"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { ProductType } from "@prisma/client";

import { saveProduct, type AdminState } from "@/app/actions/admin-products";
import { formatDuration } from "@/lib/format";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Field,
  Input,
  Select,
  Textarea,
  cn,
} from "../ui";
import { FileTextIcon, HeadphonesIcon, BookIcon } from "../icons";

const initialState: AdminState = { ok: false, message: "" };

export type ProductFormData = {
  id?: string;
  type: ProductType;
  title: string;
  slug: string;
  author: string;
  description: string;
  shortDesc: string;
  price: string;
  compareAt: string;
  stock: number;
  lowStockAlert: number;
  durationSeconds: number | null;
  previewPages: number;
  categoryId: string;
  isPublished: boolean;
  isFeatured: boolean;
  isBestseller: boolean;
  isFree: boolean;
  metaTitle: string;
  metaDescription: string;
  coverUrl: string | null;
  hasFile: boolean;
  hasPreview: boolean;
  relatedIds: string[];
  gallery: { id: string; url: string }[];
};

const TYPE_OPTIONS: {
  value: ProductType;
  label: string;
  icon: typeof BookIcon;
  hint: string;
}[] = [
  {
    value: "PHYSICAL",
    label: "Физическа книга",
    icon: BookIcon,
    hint: "Хартиено издание с доставка и количество на склад.",
  },
  {
    value: "PDF",
    label: "PDF книга",
    icon: FileTextIcon,
    hint: "Дигитално издание — качва се файл, отключва се след плащане.",
  },
  {
    value: "AUDIO",
    label: "Аудио",
    icon: HeadphonesIcon,
    hint: "Медитация, четене или програма. Може да е безплатно.",
  },
];

export function ProductForm({
  product,
  categories,
  allProducts,
}: {
  product?: ProductFormData;
  categories: { id: string; name: string }[];
  allProducts: { id: string; title: string; type: ProductType }[];
}) {
  const [state, action, pending] = useActionState(saveProduct, initialState);
  const [type, setType] = useState<ProductType>(product?.type ?? "PHYSICAL");
  const [isFree, setIsFree] = useState(product?.isFree ?? false);
  const [related, setRelated] = useState<string[]>(product?.relatedIds ?? []);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    product?.coverUrl ?? null,
  );
  const [removedImages, setRemovedImages] = useState<string[]>([]);

  const isEdit = Boolean(product?.id);
  const isPhysical = type === "PHYSICAL";
  const isPdf = type === "PDF";
  const isAudio = type === "AUDIO";

  return (
    <form action={action} className="space-y-6">
      {product?.id && <input type="hidden" name="id" value={product.id} />}
      <input type="hidden" name="type" value={type} />
      {related.map((id) => (
        <input key={id} type="hidden" name="relatedIds" value={id} />
      ))}

      {/* Тип продукт */}
      <Card className="p-6">
        <h2 className="font-sans text-lg font-bold mb-1">Тип продукт</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Определя какви полета се показват и как се доставя на клиента.
        </p>

        <div className="grid sm:grid-cols-3 gap-3">
          {TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = type === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setType(option.value)}
                disabled={isEdit}
                className={cn(
                  "p-4 text-left border rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                )}
              >
                <Icon size={20} className={active ? "text-primary" : ""} />
                <span className="mt-2 block font-sans text-sm font-bold">
                  {option.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {option.hint}
                </span>
              </button>
            );
          })}
        </div>

        {isEdit && (
          <p className="mt-3 text-xs text-muted-foreground">
            Типът не може да се променя след създаване — създайте нов продукт,
            ако е нужно.
          </p>
        )}
      </Card>

      {/* Основна информация */}
      <Card className="p-6 space-y-4">
        <h2 className="font-sans text-lg font-bold">Основна информация</h2>

        <Field label="Заглавие" htmlFor="p-title" required error={state.errors?.title}>
          <Input
            id="p-title"
            name="title"
            defaultValue={product?.title}
            required
            maxLength={200}
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Автор" htmlFor="p-author" error={state.errors?.author}>
            <Input
              id="p-author"
              name="author"
              defaultValue={product?.author}
              maxLength={120}
            />
          </Field>

          <Field
            label="Категория"
            htmlFor="p-category"
            hint="Използва се за филтриране в каталога."
          >
            <Select id="p-category" name="categoryId" defaultValue={product?.categoryId}>
              <option value="">— без категория —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Кратко описание"
          htmlFor="p-short"
          hint="Показва се в списъците и при търсене. До 500 символа."
          error={state.errors?.shortDesc}
        >
          <Textarea
            id="p-short"
            name="shortDesc"
            defaultValue={product?.shortDesc}
            maxLength={500}
            rows={2}
          />
        </Field>

        <Field
          label="Пълно описание"
          htmlFor="p-description"
          required
          hint="Поддържа HTML: <p>, <strong>, <em>, <ul>, <li>, <h2>, <blockquote>."
          error={state.errors?.description}
        >
          <Textarea
            id="p-description"
            name="description"
            defaultValue={product?.description}
            required
            rows={10}
            className="font-mono text-xs"
          />
        </Field>

        <Field
          label="URL адрес (slug)"
          htmlFor="p-slug"
          hint="Оставете празно за автоматично генериране от заглавието."
        >
          <Input
            id="p-slug"
            name="slug"
            defaultValue={product?.slug}
            maxLength={100}
            className="font-mono text-xs"
            placeholder="knigata-koyato-tarsish"
          />
        </Field>
      </Card>

      {/* Цена и наличност */}
      <Card className="p-6 space-y-4">
        <h2 className="font-sans text-lg font-bold">Цена и наличност</h2>

        {isAudio && (
          <label className="flex items-start gap-3 p-4 bg-muted rounded-md cursor-pointer">
            <Checkbox
              name="isFree"
              checked={isFree}
              onChange={(e) => setIsFree(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="block font-sans text-sm font-bold">
                Безплатно съдържание
              </span>
              <span className="block text-xs text-muted-foreground">
                Всеки посетител може да слуша без покупка и без регистрация.
              </span>
            </span>
          </label>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Цена (лв.)"
            htmlFor="p-price"
            required={!isFree}
            error={state.errors?.priceCents}
          >
            <Input
              id="p-price"
              name="priceCents"
              defaultValue={product?.price ?? "0.00"}
              required
              inputMode="decimal"
              className="font-mono"
              disabled={isFree}
            />
          </Field>

          <Field
            label="Стара цена (лв.)"
            htmlFor="p-compare"
            hint="Показва се зачертана. Оставете празно, ако няма промоция."
            error={state.errors?.compareAtCents}
          >
            <Input
              id="p-compare"
              name="compareAtCents"
              defaultValue={product?.compareAt}
              inputMode="decimal"
              className="font-mono"
              placeholder=""
            />
          </Field>
        </div>

        {isPhysical && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              label="Количество на склад"
              htmlFor="p-stock"
              required
              error={state.errors?.stock}
            >
              <Input
                id="p-stock"
                name="stock"
                type="number"
                min={0}
                max={100000}
                defaultValue={product?.stock ?? 0}
                required
                className="font-mono"
              />
            </Field>

            <Field
              label="Праг за известие"
              htmlFor="p-low"
              hint="Известие при спадане до тази бройка."
            >
              <Input
                id="p-low"
                name="lowStockAlert"
                type="number"
                min={0}
                max={1000}
                defaultValue={product?.lowStockAlert ?? 3}
                className="font-mono"
              />
            </Field>
          </div>
        )}

        {isAudio && (
          <Field
            label="Продължителност (секунди)"
            htmlFor="p-duration"
            hint={
              product?.durationSeconds
                ? `Текущо: ${formatDuration(product.durationSeconds)}`
                : "Например 1830 за 30 мин 30 сек."
            }
          >
            <Input
              id="p-duration"
              name="durationSeconds"
              type="number"
              min={0}
              defaultValue={product?.durationSeconds ?? ""}
              className="font-mono"
            />
          </Field>
        )}
      </Card>

      {/* Файлове */}
      <Card className="p-6 space-y-5">
        <h2 className="font-sans text-lg font-bold">Файлове</h2>

        {/* Корица */}
        <div>
          <label
            htmlFor="p-cover"
            className="block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2"
          >
            Корица
          </label>

          <div className="flex items-start gap-4">
            {coverPreview && (
              <div className="relative w-20 h-28 shrink-0 bg-muted rounded-sm overflow-hidden border border-border">
                <Image
                  src={coverPreview}
                  alt="Преглед на корицата"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized={coverPreview.startsWith("blob:")}
                />
              </div>
            )}

            <div className="flex-1">
              <input
                id="p-cover"
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
                JPG, PNG, WebP или AVIF. До 8 MB. Препоръчително съотношение 2:3.
              </p>
              {state.errors?.coverFile && (
                <p className="mt-1 text-xs text-destructive">{state.errors.coverFile}</p>
              )}
            </div>
          </div>
        </div>

        {/* Галерия — допълнителни снимки */}
        <div className="pt-4 border-t border-border">
          <span className="block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Допълнителни снимки (галерия)
          </span>

          {product?.gallery && product.gallery.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
              {product.gallery.map((image) => {
                const marked = removedImages.includes(image.id);
                return (
                  <label
                    key={image.id}
                    className="relative aspect-square rounded-sm overflow-hidden border-2 cursor-pointer group"
                    style={{
                      borderColor: marked ? "var(--destructive)" : "var(--border)",
                    }}
                    title={marked ? "Ще бъде премахната" : "Отбележи за премахване"}
                  >
                    <Image
                      src={image.url}
                      alt=""
                      fill
                      sizes="96px"
                      className={cn(
                        "object-cover transition-opacity",
                        marked && "opacity-30",
                      )}
                    />
                    <input
                      type="checkbox"
                      name="removeImageIds"
                      value={image.id}
                      checked={marked}
                      onChange={(e) =>
                        setRemovedImages((prev) =>
                          e.target.checked
                            ? [...prev, image.id]
                            : prev.filter((id) => id !== image.id),
                        )
                      }
                      className="sr-only"
                    />
                    <span
                      className={cn(
                        "absolute inset-x-0 bottom-0 py-0.5 text-center font-sans text-[10px] font-bold",
                        marked
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-card/90 opacity-0 group-hover:opacity-100 transition-opacity",
                      )}
                    >
                      {marked ? "Премахва се" : "Премахни"}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <input
            id="p-gallery"
            name="galleryFiles"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="block w-full text-sm file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-border file:bg-secondary file:text-secondary-foreground file:font-sans file:text-xs file:font-bold hover:file:bg-accent file:cursor-pointer"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Може да изберете няколко наведнъж. Показват се в галерията на
            страницата на книгата, след корицата. Максимум 8 снимки общо.
          </p>
        </div>

        {/* Основен файл */}
        {!isPhysical && (
          <div className="pt-4 border-t border-border">
            <label
              htmlFor="p-file"
              className="block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2"
            >
              {isPdf ? "PDF файл" : "Аудио файл"}
              {!isEdit && <span className="text-destructive ml-0.5">*</span>}
            </label>

            {product?.hasFile && (
              <p className="mb-2 text-xs text-success">
                ✓ Има качен файл. Изберете нов само ако искате да го замените.
              </p>
            )}

            <input
              id="p-file"
              name="mainFile"
              type="file"
              accept={
                isPdf
                  ? "application/pdf"
                  : "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg,video/mp4,video/webm"
              }
              className="block w-full text-sm file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-border file:bg-secondary file:text-secondary-foreground file:font-sans file:text-xs file:font-bold hover:file:bg-accent file:cursor-pointer"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isPdf
                ? "PDF, до 100 MB. Файлът е защитен — достъпен само след покупка."
                : "MP3, M4A, WAV, OGG или MP4/WebM видео. До 500 MB."}
            </p>
            {state.errors?.mainFile && (
              <p className="mt-1 text-xs text-destructive">{state.errors.mainFile}</p>
            )}
          </div>
        )}

        {/* Preview */}
        {!isPhysical && !isFree && (
          <div className="pt-4 border-t border-border">
            <label
              htmlFor="p-preview"
              className="block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2"
            >
              Безплатен откъс
            </label>

            {product?.hasPreview && (
              <p className="mb-2 text-xs text-success">✓ Има качен откъс.</p>
            )}

            <input
              id="p-preview"
              name="previewFile"
              type="file"
              accept={
                isPdf
                  ? "application/pdf"
                  : "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/ogg"
              }
              className="block w-full text-sm file:mr-3 file:h-9 file:px-3 file:rounded-md file:border file:border-border file:bg-secondary file:text-secondary-foreground file:font-sans file:text-xs file:font-bold hover:file:bg-accent file:cursor-pointer"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {isPdf
                ? "Отделен PDF само с първите страници. Значително повишава продажбите."
                : "Кратък откъс за прослушване преди покупка."}
            </p>
            {state.errors?.previewFile && (
              <p className="mt-1 text-xs text-destructive">{state.errors.previewFile}</p>
            )}

            {isPdf && (
              <div className="mt-4 max-w-xs">
                <Field
                  label="Брой страници в откъса"
                  htmlFor="p-preview-pages"
                  hint="Показва се като текст на страницата."
                >
                  <Input
                    id="p-preview-pages"
                    name="previewPages"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={product?.previewPages ?? 0}
                    className="font-mono"
                  />
                </Field>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Свързани книги */}
      <Card className="p-6">
        <h2 className="font-sans text-lg font-bold mb-1">
          Свързани заглавия („Може да ви хареса“)
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Изберете до 4 заглавия. Ако не изберете нищо, системата ще предложи
          автоматично от същата категория.
        </p>

        <div className="max-h-56 overflow-y-auto border border-border rounded-md divide-y divide-border">
          {allProducts
            .filter((p) => p.id !== product?.id)
            .map((p) => {
              const checked = related.includes(p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onChange={(e) => {
                      setRelated((prev) =>
                        e.target.checked
                          ? [...prev, p.id].slice(0, 4)
                          : prev.filter((id) => id !== p.id),
                      );
                    }}
                    disabled={!checked && related.length >= 4}
                  />
                  <span className="text-sm truncate">{p.title}</span>
                </label>
              );
            })}
        </div>
      </Card>

      {/* SEO */}
      <Card className="p-6 space-y-4">
        <h2 className="font-sans text-lg font-bold">SEO</h2>
        <p className="text-sm text-muted-foreground -mt-2">
          Оставете празно и системата ще генерира автоматично от заглавието и
          описанието.
        </p>

        <Field
          label="Мета заглавие"
          htmlFor="p-meta-title"
          hint="До 70 символа — толкова показва Google."
        >
          <Input
            id="p-meta-title"
            name="metaTitle"
            defaultValue={product?.metaTitle}
            maxLength={70}
          />
        </Field>

        <Field
          label="Мета описание"
          htmlFor="p-meta-desc"
          hint="До 160 символа."
        >
          <Textarea
            id="p-meta-desc"
            name="metaDescription"
            defaultValue={product?.metaDescription}
            maxLength={200}
            rows={2}
          />
        </Field>
      </Card>

      {/* Видимост */}
      <Card className="p-6">
        <h2 className="font-sans text-lg font-bold mb-4">Видимост</h2>

        <div className="space-y-3">
          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              name="isPublished"
              defaultChecked={product?.isPublished ?? false}
              className="mt-0.5"
            />
            <span>
              <span className="block font-sans text-sm font-bold">Публикуван</span>
              <span className="block text-xs text-muted-foreground">
                Видим в сайта. Изключете, за да го запазите като чернова.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              name="isBestseller"
              defaultChecked={product?.isBestseller ?? false}
              className="mt-0.5"
            />
            <span>
              <span className="block font-sans text-sm font-bold">Най-продаван</span>
              <span className="block text-xs text-muted-foreground">
                Показва се в секция „Най-продавани“ на началната страница.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              name="isFeatured"
              defaultChecked={product?.isFeatured ?? false}
              className="mt-0.5"
            />
            <span>
              <span className="block font-sans text-sm font-bold">Препоръчан</span>
              <span className="block text-xs text-muted-foreground">
                Извежда се напред в промо секциите.
              </span>
            </span>
          </label>
        </div>
      </Card>

      {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <div className="flex flex-wrap items-center gap-3 sticky bottom-0 py-4 bg-background border-t border-border">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Запазване…" : isEdit ? "Запази промените" : "Създай продукт"}
        </Button>
        <ButtonLink href="/admin/produkti" variant="ghost">
          Отказ
        </ButtonLink>
        {pending && (
          <span className="text-xs text-muted-foreground">
            Качването на големи файлове може да отнеме време — не затваряйте
            страницата.
          </span>
        )}
      </div>
    </form>
  );
}
