"use client";

import { useActionState, useState } from "react";
import { submitReview, type ReviewState } from "@/app/actions/reviews";
import { Button, Card, Field, Input, Textarea, Stars, Badge, Alert } from "./ui";
import { formatDate } from "@/lib/format";

export type ReviewItem = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  createdAt: Date;
  user: { name: string | null };
};

const initialState: ReviewState = { ok: false, message: "" };

export function ReviewSection({
  productId,
  reviews,
  average,
  count,
  canReview,
  hasReviewed,
  isLoggedIn,
}: {
  productId: string;
  reviews: ReviewItem[];
  average: number;
  count: number;
  canReview: boolean;
  hasReviewed: boolean;
  isLoggedIn: boolean;
}) {
  const [showForm, setShowForm] = useState(false);

  // Разпределение на оценките — показва дали 4.5 идва от 2 или от 200 ревюта.
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    n: reviews.filter((r) => r.rating === star).length,
  }));

  return (
    <section className="mt-16 pt-12 border-t border-border" aria-labelledby="reviews">
      <h2 id="reviews" className="text-2xl sm:text-3xl rule mb-8">
        Ревюта и оценки
      </h2>

      <div className="grid lg:grid-cols-3 gap-10">
        {/* Обобщение */}
        <div className="lg:col-span-1">
          {count > 0 ? (
            <Card className="p-6">
              <div className="flex items-baseline gap-3">
                <span className="font-sans text-4xl font-bold tabular-nums">
                  {average.toFixed(1)}
                </span>
                <span className="text-muted-foreground text-sm">от 5</span>
              </div>
              <Stars rating={average} size={18} className="mt-2" />
              <p className="mt-2 text-sm text-muted-foreground">
                {count === 1 ? "1 ревю" : `${count} ревюта`}
              </p>

              <div className="mt-5 space-y-1.5">
                {distribution.map(({ star, n }) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="w-8 text-muted-foreground tabular-nums">{star} ★</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: count > 0 ? `${(n / count) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground tabular-nums">
                      {n}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <p className="text-sm text-muted-foreground">
                Все още няма ревюта за това заглавие. Бъдете първи.
              </p>
            </Card>
          )}

          {!showForm && (
            <div className="mt-4">
              {!isLoggedIn ? (
                <a
                  href="/vhod"
                  className="text-sm text-primary underline underline-offset-4"
                >
                  Влезте, за да напишете ревю
                </a>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setShowForm(true)}
                  className="w-full"
                >
                  {hasReviewed ? "Редактирай ревюто си" : "Напиши ревю"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Списък + форма */}
        <div className="lg:col-span-2 space-y-6">
          {showForm && canReview && (
            <ReviewForm
              productId={productId}
              onDone={() => setShowForm(false)}
              isEdit={hasReviewed}
            />
          )}

          {reviews.length === 0 && !showForm && (
            <p className="text-sm text-muted-foreground">
              Тук ще се появят мненията на читателите.
            </p>
          )}

          {reviews.map((review) => (
            <article key={review.id} className="pb-6 border-b border-border last:border-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Stars rating={review.rating} size={14} />
                <span className="font-sans text-sm font-bold">
                  {review.user.name ?? "Читател"}
                </span>
                {review.verifiedPurchase && (
                  <Badge tone="success">Потвърдена покупка</Badge>
                )}
                <time
                  dateTime={new Date(review.createdAt).toISOString()}
                  className="text-xs text-muted-foreground ml-auto"
                >
                  {formatDate(review.createdAt)}
                </time>
              </div>

              {review.title && (
                <h3 className="mt-2 font-sans font-bold text-sm">{review.title}</h3>
              )}
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/90 whitespace-pre-line">
                {review.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ReviewForm({
  productId,
  onDone,
  isEdit,
}: {
  productId: string;
  onDone: () => void;
  isEdit: boolean;
}) {
  const [state, action, pending] = useActionState(submitReview, initialState);
  const [rating, setRating] = useState(0);

  if (state.ok) {
    return (
      <Alert tone="success">
        {state.message}{" "}
        <button
          type="button"
          onClick={onDone}
          className="underline underline-offset-2 ml-1"
        >
          Затвори
        </button>
      </Alert>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="font-sans font-bold mb-4">
        {isEdit ? "Редактирайте ревюто си" : "Вашето ревю"}
      </h3>

      <form action={action} className="space-y-4">
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="rating" value={rating} />

        <div>
          <span className="block font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Оценка <span className="text-destructive">*</span>
          </span>
          <div className="flex gap-1" role="radiogroup" aria-label="Оценка от 1 до 5 звезди">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} ${star === 1 ? "звезда" : "звезди"}`}
                onClick={() => setRating(star)}
                className="p-0.5 transition-transform hover:scale-110"
              >
                <svg
                  width={26}
                  height={26}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className={star <= rating ? "text-primary" : "text-border"}
                >
                  <path d="M10 1.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L10 14.9l-5.3 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                </svg>
              </button>
            ))}
          </div>
          {state.errors?.rating && (
            <p className="mt-1 text-xs text-destructive">{state.errors.rating}</p>
          )}
        </div>

        <Field label="Заглавие" htmlFor="review-title" error={state.errors?.title}>
          <Input
            id="review-title"
            name="title"
            maxLength={120}
            placeholder="Обобщете в едно изречение"
          />
        </Field>

        <Field
          label="Вашето мнение"
          htmlFor="review-body"
          required
          error={state.errors?.body}
        >
          <Textarea
            id="review-body"
            name="body"
            required
            minLength={10}
            maxLength={2000}
            placeholder="Какво ви даде тази книга?"
          />
        </Field>

        {state.message && !state.ok && <Alert tone="error">{state.message}</Alert>}

        <div className="flex gap-2">
          <Button type="submit" disabled={pending || rating === 0}>
            {pending ? "Изпращане…" : "Публикувай"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Отказ
          </Button>
        </div>
      </form>
    </Card>
  );
}
