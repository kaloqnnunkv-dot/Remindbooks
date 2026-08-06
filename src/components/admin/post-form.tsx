"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { savePost } from "@/app/actions/admin-content";
import type { AdminState } from "@/app/actions/admin-products";
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  Checkbox,
  Field,
  Input,
  Textarea,
} from "../ui";

const initialState: AdminState = { ok: false, message: "" };

export type PostFormData = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  isPublished: boolean;
  metaTitle: string;
  metaDescription: string;
  coverUrl: string | null;
  tags: string;
};

export function PostForm({ post }: { post?: PostFormData }) {
  const [state, action, pending] = useActionState(savePost, initialState);
  const [coverPreview, setCoverPreview] = useState<string | null>(
    post?.coverUrl ?? null,
  );

  const isEdit = Boolean(post?.id);

  return (
    <form action={action} className="space-y-6">
      {post?.id && <input type="hidden" name="id" value={post.id} />}

      <Card className="p-6 space-y-4">
        <Field label="Заглавие" htmlFor="b-title" required error={state.errors?.title}>
          <Input
            id="b-title"
            name="title"
            defaultValue={post?.title}
            required
            maxLength={200}
          />
        </Field>

        <Field
          label="Кратко описание"
          htmlFor="b-excerpt"
          hint="Показва се в списъка с публикации. Оставете празно за автоматично генериране от текста."
          error={state.errors?.excerpt}
        >
          <Textarea
            id="b-excerpt"
            name="excerpt"
            defaultValue={post?.excerpt}
            maxLength={500}
            rows={2}
          />
        </Field>

        <Field
          label="Съдържание"
          htmlFor="b-body"
          required
          hint="Поддържа HTML: <p>, <h2>, <h3>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>, <a href>, <img src>."
          error={state.errors?.body}
        >
          <Textarea
            id="b-body"
            name="body"
            defaultValue={post?.body}
            required
            rows={20}
            className="font-mono text-xs leading-relaxed"
            placeholder="<p>Първи абзац…</p>"
          />
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            label="Тагове"
            htmlFor="b-tags"
            hint="Разделени със запетая: медитация, книги, практики"
          >
            <Input id="b-tags" name="tags" defaultValue={post?.tags} maxLength={300} />
          </Field>

          <Field
            label="URL адрес (slug)"
            htmlFor="b-slug"
            hint="Празно = автоматично от заглавието."
          >
            <Input
              id="b-slug"
              name="slug"
              defaultValue={post?.slug}
              maxLength={100}
              className="font-mono text-xs"
            />
          </Field>
        </div>
      </Card>

      {/* Корица */}
      <Card className="p-6">
        <h2 className="font-sans text-lg font-bold mb-4">Заглавно изображение</h2>

        <div className="flex items-start gap-4">
          {coverPreview && (
            <div className="relative w-32 h-20 shrink-0 bg-muted rounded-sm overflow-hidden border border-border">
              <Image
                src={coverPreview}
                alt="Преглед"
                fill
                sizes="128px"
                className="object-cover"
                unoptimized={coverPreview.startsWith("blob:")}
              />
            </div>
          )}

          <div className="flex-1">
            <input
              id="b-cover"
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
              JPG, PNG, WebP или AVIF. До 8 MB. Препоръчително съотношение 16:9.
            </p>
          </div>
        </div>
      </Card>

      {/* SEO */}
      <Card className="p-6 space-y-4">
        <h2 className="font-sans text-lg font-bold">SEO</h2>
        <p className="text-sm text-muted-foreground -mt-2">
          Празните полета се попълват автоматично от заглавието и текста.
        </p>

        <Field label="Мета заглавие" htmlFor="b-meta-title" hint="До 70 символа.">
          <Input
            id="b-meta-title"
            name="metaTitle"
            defaultValue={post?.metaTitle}
            maxLength={70}
          />
        </Field>

        <Field label="Мета описание" htmlFor="b-meta-desc" hint="До 160 символа.">
          <Textarea
            id="b-meta-desc"
            name="metaDescription"
            defaultValue={post?.metaDescription}
            maxLength={200}
            rows={2}
          />
        </Field>
      </Card>

      <Card className="p-6">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            name="isPublished"
            defaultChecked={post?.isPublished ?? false}
            className="mt-0.5"
          />
          <span>
            <span className="block font-sans text-sm font-bold">Публикувай</span>
            <span className="block text-xs text-muted-foreground">
              Изключено = запазва се като чернова, невидима за посетителите.
            </span>
          </span>
        </label>
      </Card>

      {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

      <div className="flex flex-wrap items-center gap-3 sticky bottom-0 py-4 bg-background border-t border-border">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Запазване…" : isEdit ? "Запази промените" : "Създай публикация"}
        </Button>
        <ButtonLink href="/admin/blog" variant="ghost">
          Отказ
        </ButtonLink>
      </div>
    </form>
  );
}
