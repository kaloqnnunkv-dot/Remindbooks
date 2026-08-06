"use client";

import { useActionState } from "react";
import { submitComment, type CommentState } from "@/app/actions/comments";
import { Alert, Button, Card, Field, Input, Textarea } from "./ui";
import { formatDate } from "@/lib/format";

export type CommentItem = {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
};

const initialState: CommentState = { ok: false, message: "" };

export function CommentSection({
  postId,
  comments,
}: {
  postId: string;
  comments: CommentItem[];
}) {
  const [state, action, pending] = useActionState(submitComment, initialState);

  return (
    <section className="mt-14 pt-10 border-t border-border" aria-labelledby="comments">
      <h2 id="comments" className="text-2xl rule mb-8">
        Коментари
        {comments.length > 0 && (
          <span className="text-muted-foreground font-normal ml-2 text-lg">
            ({comments.length})
          </span>
        )}
      </h2>

      {comments.length > 0 && (
        <div className="space-y-6 mb-10">
          {comments.map((c) => (
            <article key={c.id} className="pb-6 border-b border-border last:border-0">
              <div className="flex items-baseline gap-3">
                <span className="font-sans text-sm font-bold">{c.authorName}</span>
                <time
                  dateTime={new Date(c.createdAt).toISOString()}
                  className="text-xs text-muted-foreground"
                >
                  {formatDate(c.createdAt)}
                </time>
              </div>
              <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-foreground/90">
                {c.body}
              </p>
            </article>
          ))}
        </div>
      )}

      {state.ok ? (
        <Alert tone="success">{state.message}</Alert>
      ) : (
        <Card className="p-6">
          <h3 className="font-sans font-bold mb-4">Оставете коментар</h3>

          <form action={action} className="space-y-4">
            <input type="hidden" name="postId" value={postId} />

            {/* Honeypot — скрито от хора, попълва се от ботове */}
            <div aria-hidden="true" className="absolute -left-[9999px] opacity-0">
              <label htmlFor="website-comment">Уебсайт</label>
              <input
                id="website-comment"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Име"
                htmlFor="comment-name"
                required
                error={state.errors?.authorName}
              >
                <Input
                  id="comment-name"
                  name="authorName"
                  required
                  maxLength={80}
                  autoComplete="name"
                />
              </Field>

              <Field
                label="Имейл"
                htmlFor="comment-email"
                required
                hint="Няма да бъде публикуван."
                error={state.errors?.authorEmail}
              >
                <Input
                  id="comment-email"
                  name="authorEmail"
                  type="email"
                  required
                  autoComplete="email"
                />
              </Field>
            </div>

            <Field
              label="Коментар"
              htmlFor="comment-body"
              required
              error={state.errors?.body}
            >
              <Textarea id="comment-body" name="body" required maxLength={2000} />
            </Field>

            {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? "Изпращане…" : "Публикувай коментар"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Коментарите се публикуват след преглед.
              </p>
            </div>
          </form>
        </Card>
      )}
    </section>
  );
}
