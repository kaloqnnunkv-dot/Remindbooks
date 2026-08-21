"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { postSchema, promoCodeSchema, fieldErrors } from "@/lib/validation";
import { slugify, truncate, stripHtml } from "@/lib/format";
import {
  uploadFile,
  deleteFile,
  makeKey,
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/lib/storage";
import { IMAGE_SLOTS, type ImageSlot } from "@/lib/images";
import { THEME_TOKENS, isHexColor } from "@/lib/theme";
import type { AdminState } from "./admin-products";

const empty: AdminState = { ok: false, message: "" };

// ------------------------------------------------------------------
// Блог
// ------------------------------------------------------------------

async function uniquePostSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "publikacia";
  let candidate = root;

  for (let i = 2; i < 100; i++) {
    const existing = await db.post.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export async function savePost(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const postId = formData.get("id")?.toString() || null;
  const parsed = postSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const existing = postId
    ? await db.post.findUnique({
        where: { id: postId },
        select: { coverImage: true, slug: true, publishedAt: true },
      })
    : null;

  if (postId && !existing) return { ...empty, message: "Публикацията не е намерена." };

  // Корица
  let coverKey: string | null = null;
  const coverFile = formData.get("coverFile");
  if (coverFile instanceof File && coverFile.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.includes(coverFile.type)) {
      return { ...empty, message: "Неподдържан тип изображение." };
    }
    if (coverFile.size > MAX_IMAGE_BYTES) {
      return { ...empty, message: "Изображението е твърде голямо (максимум 8 MB)." };
    }
    const buffer = Buffer.from(await coverFile.arrayBuffer());
    coverKey = makeKey("blog", coverFile.name);
    await uploadFile(coverKey, buffer, coverFile.type);
  }

  const slug = await uniquePostSlug(data.slug || data.title, postId ?? undefined);

  // Резюмето се генерира автоматично, ако авторът не го е попълнил —
  // изискване на спецификацията ("кратко описание (автоматично)").
  const excerpt = data.excerpt?.trim() || truncate(stripHtml(data.body), 180);

  // Тагове: приемат се разделени със запетая.
  const tagNames = (data.tags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 10);

  const tagConnections = await Promise.all(
    tagNames.map(async (name) => {
      const tagSlug = slugify(name) || `tag-${Date.now()}`;
      return db.tag.upsert({
        where: { slug: tagSlug },
        create: { name, slug: tagSlug },
        update: { name },
        select: { id: true },
      });
    }),
  );

  const base = {
    slug,
    title: data.title,
    excerpt,
    body: data.body,
    isPublished: data.isPublished,
    // Датата на публикуване се задава при първото публикуване и не се променя.
    publishedAt: data.isPublished
      ? (existing?.publishedAt ?? new Date())
      : null,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    ...(coverKey ? { coverImage: coverKey } : {}),
  };

  const tagIds = tagConnections.map((t) => ({ id: t.id }));

  if (postId) {
    // `set` замества целия списък с тагове — точно каквото искаме при редакция.
    await db.post.update({
      where: { id: postId },
      data: { ...base, tags: { set: tagIds } },
    });
    if (coverKey && existing?.coverImage) await deleteFile(existing.coverImage);
  } else {
    // При създаване се използва `connect`; `set` не е валидно тук.
    await db.post.create({
      data: { ...base, tags: { connect: tagIds } },
    });
  }

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/");
  if (existing?.slug && existing.slug !== slug) revalidatePath(`/blog/${existing.slug}`);

  redirect("/admin/blog?saved=1");
}

export async function deletePost(postId: string): Promise<AdminState> {
  await requireAdmin();

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { coverImage: true, slug: true },
  });
  if (!post) return { ...empty, message: "Публикацията не е намерена." };

  await db.post.delete({ where: { id: postId } });
  if (post.coverImage) await deleteFile(post.coverImage);

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath("/");
  return { ok: true, message: "Публикацията е изтрита." };
}

export async function togglePostPublished(postId: string): Promise<AdminState> {
  await requireAdmin();

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { isPublished: true, publishedAt: true, slug: true },
  });
  if (!post) return { ...empty, message: "Публикацията не е намерена." };

  const next = !post.isPublished;

  await db.post.update({
    where: { id: postId },
    data: {
      isPublished: next,
      publishedAt: next ? (post.publishedAt ?? new Date()) : null,
    },
  });

  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  revalidatePath(`/blog/${post.slug}`);
  revalidatePath("/");

  return { ok: true, message: next ? "Публикувана." : "Върната в чернови." };
}

// ------------------------------------------------------------------
// Промо кодове
// ------------------------------------------------------------------

export async function savePromoCode(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const id = formData.get("id")?.toString() || null;
  const parsed = promoCodeSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const d = parsed.data;

  const payload = {
    code: d.code,
    discountType: d.discountType,
    amount: d.amount,
    minOrderCents: d.minOrderCents ?? null,
    startsAt: d.startsAt ? new Date(d.startsAt) : null,
    expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    maxUses: d.maxUses ?? null,
    isActive: d.isActive,
    description: d.description || null,
  };

  try {
    if (id) {
      await db.promoCode.update({ where: { id }, data: payload });
    } else {
      await db.promoCode.create({ data: payload });
    }
  } catch {
    return {
      ok: false,
      message: "Промо код с този код вече съществува.",
      errors: { code: "Кодът вече се използва." },
    };
  }

  revalidatePath("/admin/promo");
  return { ok: true, message: "Промо кодът е запазен." };
}

export async function togglePromoCode(id: string): Promise<AdminState> {
  await requireAdmin();

  const promo = await db.promoCode.findUnique({
    where: { id },
    select: { isActive: true },
  });
  if (!promo) return { ...empty, message: "Кодът не е намерен." };

  await db.promoCode.update({
    where: { id },
    data: { isActive: !promo.isActive },
  });

  revalidatePath("/admin/promo");
  return { ok: true, message: promo.isActive ? "Кодът е деактивиран." : "Кодът е активиран." };
}

export async function deletePromoCode(id: string): Promise<AdminState> {
  await requireAdmin();

  const usedIn = await db.order.count({ where: { promoCodeId: id } });
  if (usedIn > 0) {
    // Кодът е част от историята на поръчките — само го деактивираме.
    await db.promoCode.update({ where: { id }, data: { isActive: false } });
    revalidatePath("/admin/promo");
    return {
      ok: true,
      message: "Кодът е използван в поръчки, затова беше деактивиран вместо изтрит.",
    };
  }

  await db.promoCode.delete({ where: { id } });
  revalidatePath("/admin/promo");
  return { ok: true, message: "Промо кодът е изтрит." };
}

// ------------------------------------------------------------------
// Настройки на сайта
// ------------------------------------------------------------------

export async function saveSettings(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const entries = Array.from(formData.entries()).filter(
    ([key]) => key !== "$ACTION_ID" && !key.startsWith("$"),
  );

  for (const [key, value] of entries) {
    if (typeof value !== "string") continue;
    await db.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  revalidatePath("/admin/nastroyki");
  revalidatePath("/za-nas");
  revalidatePath("/");
  revalidatePath("/poveritelnost");
  revalidatePath("/biskvitki");
  revalidatePath("/obshti-uslovia");
  revalidatePath("/vrashtane");

  return { ok: true, message: "Настройките са запазени." };
}

// ------------------------------------------------------------------
// Потребители
// ------------------------------------------------------------------

export async function toggleUserRole(userId: string): Promise<AdminState> {
  const admin = await requireAdmin();

  // Предпазва от отнемане на собствените администраторски права.
  if (admin.id === userId) {
    return { ...empty, message: "Не можете да промените собствената си роля." };
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (!user) return { ...empty, message: "Потребителят не е намерен." };

  await db.user.update({
    where: { id: userId },
    data: { role: user.role === "ADMIN" ? "USER" : "ADMIN" },
  });

  revalidatePath("/admin/potrebiteli");
  revalidatePath(`/admin/potrebiteli/${userId}`);

  return {
    ok: true,
    message:
      user.role === "ADMIN"
        ? "Администраторските права са отнети."
        : "Потребителят вече е администратор.",
  };
}

// ------------------------------------------------------------------
// Оформление: снимки и цветове
// ------------------------------------------------------------------

/** Страниците, по които се вижда оформлението. */
const APPEARANCE_PATHS = [
  "/",
  "/knigi",
  "/pdf",
  "/audio",
  "/blog",
  "/za-nas",
  "/admin/oformlenie",
];

function revalidateAppearance(): void {
  for (const path of APPEARANCE_PATHS) revalidatePath(path);
}

/**
 * Подменя една от снимките в оформлението.
 *
 * Старият файл се изтрива след като новият е качен — ако качването се провали,
 * сайтът остава с досегашната снимка вместо с празна рамка.
 */
export async function saveSiteImage(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const slot = String(formData.get("slot") ?? "") as ImageSlot;
  const info = IMAGE_SLOTS.find((s) => s.slot === slot);
  if (!info) return { ...empty, message: "Непознато място за снимка." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ...empty, message: "Изберете файл." };
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { ...empty, message: "Позволени са JPG, PNG, WebP и AVIF." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ...empty, message: "Файлът е над 8 MB." };
  }

  const previous = await db.setting.findUnique({ where: { key: info.setting } });

  const key = makeKey("site", file.name);
  await uploadFile(key, Buffer.from(await file.arrayBuffer()), file.type);

  await db.setting.upsert({
    where: { key: info.setting },
    create: { key: info.setting, value: key },
    update: { value: key },
  });

  if (previous?.value && previous.value !== key) await deleteFile(previous.value);

  revalidateAppearance();
  return { ok: true, message: `Снимката „${info.label}“ е подменена.` };
}

/** Връща вградената снимка и изтрива качената. */
export async function resetSiteImage(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const slot = String(formData.get("slot") ?? "") as ImageSlot;
  const info = IMAGE_SLOTS.find((s) => s.slot === slot);
  if (!info) return { ...empty, message: "Непознато място за снимка." };

  const existing = await db.setting.findUnique({ where: { key: info.setting } });
  if (!existing) return { ok: true, message: "Вече е вградената снимка." };

  await db.setting.delete({ where: { key: info.setting } });
  if (existing.value) await deleteFile(existing.value);

  revalidateAppearance();
  return { ok: true, message: `„${info.label}“ отново е вградената снимка.` };
}

/**
 * Запазва цветовете на темата.
 *
 * Приемат се само шестнайсетични цветове: стойността влиза в `<style>` на
 * страницата, тоест е код. Празно поле означава „върни изходния цвят“ и редът
 * се изтрива, вместо да се пази стойност, равна на подразбиращата се.
 */
export async function saveTheme(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const errors: Record<string, string> = {};
  const writes: { key: string; value: string }[] = [];
  const clears: string[] = [];

  for (const token of THEME_TOKENS) {
    const raw = String(formData.get(token.setting) ?? "").trim();
    if (!raw) {
      clears.push(token.setting);
      continue;
    }
    if (!isHexColor(raw)) {
      errors[token.setting] = "Очаква се цвят като #a67c52.";
      continue;
    }
    writes.push({ key: token.setting, value: raw.toLowerCase() });
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, message: "Проверете отбелязаните цветове.", errors };
  }

  for (const write of writes) {
    await db.setting.upsert({
      where: { key: write.key },
      create: write,
      update: { value: write.value },
    });
  }
  if (clears.length > 0) {
    await db.setting.deleteMany({ where: { key: { in: clears } } });
  }

  // Темата се вижда навсякъде, не само по страниците с оформление.
  revalidatePath("/", "layout");
  revalidateAppearance();
  return { ok: true, message: "Цветовете са запазени." };
}

/** Връща цялата палитра към изходната. */
export async function resetTheme(): Promise<AdminState> {
  await requireAdmin();

  await db.setting.deleteMany({
    where: { key: { in: THEME_TOKENS.map((t) => t.setting) } },
  });

  revalidatePath("/", "layout");
  revalidateAppearance();
  return { ok: true, message: "Палитрата е върната към изходната." };
}
