"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { commentSchema, fieldErrors } from "@/lib/validation";
import { limitByIp } from "@/lib/rate-limit";

export type CommentState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

/**
 * Публикува коментар под блог публикация.
 *
 * Коментарите се публикуват след одобрение от админ панела — това е
 * най-простата ефективна защита срещу спам за сайт с този размер.
 */
export async function submitComment(
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const limit = await limitByIp("comment", 5, 3600);
  if (!limit.ok) {
    return { ok: false, message: "Твърде много коментари. Опитайте по-късно." };
  }

  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  // Honeypot: истински потребител не вижда полето "website" и не го попълва.
  if (parsed.data.website) {
    return { ok: true, message: "Благодарим за коментара!" };
  }

  const post = await db.post.findFirst({
    where: { id: parsed.data.postId, isPublished: true },
    select: { id: true, slug: true },
  });
  if (!post) return { ok: false, message: "Публикацията не е намерена." };

  await db.comment.create({
    data: {
      postId: post.id,
      authorName: parsed.data.authorName,
      authorEmail: parsed.data.authorEmail,
      body: parsed.data.body,
      isApproved: false,
    },
  });

  revalidatePath(`/blog/${post.slug}`);

  return {
    ok: true,
    message: "Благодарим! Коментарът ви ще се появи след преглед.",
  };
}
