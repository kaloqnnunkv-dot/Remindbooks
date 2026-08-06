"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  productSchema,
  categorySchema,
  bundleSchema,
  fieldErrors,
} from "@/lib/validation";
import { slugify } from "@/lib/format";
import {
  uploadFile,
  deleteFile,
  makeKey,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOC_TYPES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_DOC_BYTES,
  MAX_MEDIA_BYTES,
  type UploadFolder,
} from "@/lib/storage";

export type AdminState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

const empty: AdminState = { ok: false, message: "" };

/**
 * Качва файл от формата, ако е избран. Връща ключа в хранилището или null.
 * Типът и размерът се проверяват на сървъра — HTML `accept` е само подсказка.
 */
async function handleUpload(
  file: FormDataEntryValue | null,
  folder: UploadFolder,
  allowedTypes: string[],
  maxBytes: number,
): Promise<{ key: string | null; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return { key: null };

  if (!allowedTypes.includes(file.type)) {
    return { key: null, error: `Неподдържан тип файл: ${file.type || "неизвестен"}.` };
  }
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return { key: null, error: `Файлът е твърде голям (максимум ${mb} MB).` };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = makeKey(folder, file.name);
  await uploadFile(key, buffer, file.type);
  return { key };
}

/** Гарантира уникален slug, добавяйки суфикс при нужда. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "produkt";
  let candidate = root;

  for (let i = 2; i < 100; i++) {
    const existing = await db.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

// ------------------------------------------------------------------
// Създаване и редакция на продукт
// ------------------------------------------------------------------

export async function saveProduct(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const productId = formData.get("id")?.toString() || null;

  const raw = Object.fromEntries(formData);
  const parsed = productSchema.safeParse({
    ...raw,
    relatedIds: formData.getAll("relatedIds").map(String).filter(Boolean),
    removeImageIds: formData.getAll("removeImageIds").map(String).filter(Boolean),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  // Съществуващият запис е нужен, за да изтрием старите файлове при замяна.
  const existing = productId
    ? await db.product.findUnique({
        where: { id: productId },
        select: { coverImage: true, fileKey: true, previewKey: true, slug: true },
      })
    : null;

  if (productId && !existing) {
    return { ...empty, message: "Продуктът не е намерен." };
  }

  // Качване на файлове
  const cover = await handleUpload(
    formData.get("coverFile"),
    "covers",
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_BYTES,
  );
  if (cover.error) return { ...empty, message: cover.error, errors: { coverFile: cover.error } };

  const isAudio = data.type === "AUDIO";
  const mainAllowed = isAudio
    ? [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES]
    : ALLOWED_DOC_TYPES;
  const mainFolder: UploadFolder = isAudio ? "audio" : "pdf";
  const mainMax = isAudio ? MAX_MEDIA_BYTES : MAX_DOC_BYTES;

  const mainFile = await handleUpload(
    formData.get("mainFile"),
    mainFolder,
    mainAllowed,
    mainMax,
  );
  if (mainFile.error) {
    return { ...empty, message: mainFile.error, errors: { mainFile: mainFile.error } };
  }

  const previewFile = await handleUpload(
    formData.get("previewFile"),
    "previews",
    mainAllowed,
    mainMax,
  );
  if (previewFile.error) {
    return {
      ...empty,
      message: previewFile.error,
      errors: { previewFile: previewFile.error },
    };
  }

  const slug = await uniqueSlug(data.slug || data.title, productId ?? undefined);

  const payload = {
    type: data.type,
    slug,
    title: data.title,
    author: data.author || null,
    description: data.description,
    shortDesc: data.shortDesc || null,
    priceCents: data.priceCents,
    compareAtCents: data.compareAtCents ?? null,
    stock: data.type === "PHYSICAL" ? data.stock : 0,
    lowStockAlert: data.lowStockAlert,
    durationSeconds: isAudio ? (data.durationSeconds ?? null) : null,
    isFree: isAudio ? data.isFree : false,
    previewPages: data.type === "PDF" ? data.previewPages : 0,
    categoryId: data.categoryId || null,
    isPublished: data.isPublished,
    isFeatured: data.isFeatured,
    isBestseller: data.isBestseller,
    metaTitle: data.metaTitle || null,
    metaDescription: data.metaDescription || null,
    ...(cover.key ? { coverImage: cover.key } : {}),
    ...(mainFile.key ? { fileKey: mainFile.key } : {}),
    ...(previewFile.key ? { previewKey: previewFile.key } : {}),
  };

  let savedId: string;

  if (productId) {
    await db.product.update({ where: { id: productId }, data: payload });
    savedId = productId;

    // Изтриваме заменените файлове, за да не се трупат в хранилището.
    if (cover.key && existing?.coverImage) await deleteFile(existing.coverImage);
    if (mainFile.key && existing?.fileKey) await deleteFile(existing.fileKey);
    if (previewFile.key && existing?.previewKey) await deleteFile(existing.previewKey);
  } else {
    const created = await db.product.create({ data: payload });
    savedId = created.id;
  }

  // Галерия: премахване на отбелязаните и качване на новите снимки.
  if (data.removeImageIds && data.removeImageIds.length > 0) {
    const toRemove = await db.productImage.findMany({
      where: { id: { in: data.removeImageIds }, productId: savedId },
      select: { id: true, url: true },
    });
    await db.productImage.deleteMany({
      where: { id: { in: toRemove.map((i) => i.id) } },
    });
    await Promise.all(toRemove.map((i) => deleteFile(i.url)));
  }

  const galleryFiles = formData
    .getAll("galleryFiles")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (galleryFiles.length > 0) {
    const existingCount = await db.productImage.count({
      where: { productId: savedId },
    });

    // Ограничаваме галерията до 8 снимки — повече не носят стойност,
    // а само утежняват страницата.
    for (const [index, file] of galleryFiles.slice(0, 8 - existingCount).entries()) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) continue;
      if (file.size > MAX_IMAGE_BYTES) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const key = makeKey("covers", file.name);
      await uploadFile(key, buffer, file.type);

      await db.productImage.create({
        data: {
          productId: savedId,
          url: key,
          alt: data.title,
          order: existingCount + index,
        },
      });
    }
  }

  // Свързани книги ("Може да ви хареса")
  if (data.relatedIds) {
    await db.productRelation.deleteMany({ where: { sourceId: savedId } });
    const targets = data.relatedIds.filter((id) => id !== savedId);
    if (targets.length > 0) {
      await db.productRelation.createMany({
        data: targets.map((targetId) => ({ sourceId: savedId, targetId })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath("/admin/produkti");
  revalidatePath("/");
  const base =
    data.type === "PHYSICAL" ? "/knigi" : data.type === "PDF" ? "/pdf" : "/audio";
  revalidatePath(base);
  revalidatePath(`${base}/${slug}`);
  if (existing?.slug && existing.slug !== slug) revalidatePath(`${base}/${existing.slug}`);

  redirect(`/admin/produkti?saved=${savedId}`);
}

export async function deleteProduct(productId: string): Promise<AdminState> {
  await requireAdmin();

  const product = await db.product.findUnique({
    where: { id: productId },
    select: {
      coverImage: true, fileKey: true, previewKey: true, type: true, slug: true,
      images: { select: { url: true } },
      _count: { select: { orderItems: true } },
    },
  });

  if (!product) return { ...empty, message: "Продуктът не е намерен." };

  // Продукт с поръчки не се трие — само се скрива, за да останат поръчките верни.
  if (product._count.orderItems > 0) {
    await db.product.update({
      where: { id: productId },
      data: { isPublished: false },
    });
    revalidatePath("/admin/produkti");
    return {
      ok: true,
      message:
        "Продуктът има направени поръчки, затова беше скрит вместо изтрит (историята се запазва).",
    };
  }

  await db.product.delete({ where: { id: productId } });

  await Promise.all([
    product.coverImage ? deleteFile(product.coverImage) : null,
    product.fileKey ? deleteFile(product.fileKey) : null,
    product.previewKey ? deleteFile(product.previewKey) : null,
    ...product.images.map((i) => deleteFile(i.url)),
  ]);

  revalidatePath("/admin/produkti");
  revalidatePath("/");
  return { ok: true, message: "Продуктът е изтрит." };
}

export async function toggleProductFlag(
  productId: string,
  field: "isPublished" | "isFeatured" | "isBestseller",
): Promise<AdminState> {
  await requireAdmin();

  const product = await db.product.findUnique({
    where: { id: productId },
    select: { [field]: true, type: true, slug: true } as Record<string, true>,
  });
  if (!product) return { ...empty, message: "Продуктът не е намерен." };

  await db.product.update({
    where: { id: productId },
    data: { [field]: !product[field] },
  });

  revalidatePath("/admin/produkti");
  revalidatePath("/");
  return { ok: true, message: "Промяната е запазена." };
}

// ------------------------------------------------------------------
// Наличности
// ------------------------------------------------------------------

export async function updateStock(
  productId: string,
  stock: number,
): Promise<AdminState> {
  await requireAdmin();

  if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
    return { ...empty, message: "Невалидно количество." };
  }

  await db.product.update({ where: { id: productId }, data: { stock } });

  revalidatePath("/admin/nalichnosti");
  revalidatePath("/knigi");
  return { ok: true, message: "Наличността е обновена." };
}

export async function updateLowStockAlert(
  productId: string,
  threshold: number,
): Promise<AdminState> {
  await requireAdmin();

  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 1000) {
    return { ...empty, message: "Невалидна стойност." };
  }

  await db.product.update({
    where: { id: productId },
    data: { lowStockAlert: threshold },
  });

  revalidatePath("/admin/nalichnosti");
  return { ok: true, message: "Прагът е обновен." };
}

// ------------------------------------------------------------------
// Категории
// ------------------------------------------------------------------

export async function saveCategory(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const id = formData.get("id")?.toString() || null;
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките.",
      errors: fieldErrors(parsed.error),
    };
  }

  const slug = slugify(parsed.data.name) || `kategoria-${Date.now()}`;

  try {
    if (id) {
      await db.category.update({
        where: { id },
        data: { name: parsed.data.name, slug, order: parsed.data.order },
      });
    } else {
      await db.category.create({
        data: { name: parsed.data.name, slug, order: parsed.data.order },
      });
    }
  } catch {
    return { ...empty, message: "Категория с това име вече съществува." };
  }

  revalidatePath("/admin/produkti/kategorii");
  revalidatePath("/knigi");
  return { ok: true, message: "Категорията е запазена." };
}

export async function deleteCategory(id: string): Promise<AdminState> {
  await requireAdmin();

  // Продуктите остават — само губят категорията си (onDelete: SetNull).
  await db.category.delete({ where: { id } });

  revalidatePath("/admin/produkti/kategorii");
  revalidatePath("/knigi");
  return { ok: true, message: "Категорията е изтрита." };
}

// ------------------------------------------------------------------
// Комплекти книги (bundle-и)
// ------------------------------------------------------------------

async function uniqueBundleSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base) || "komplekt";
  let candidate = root;

  for (let i = 2; i < 100; i++) {
    const existing = await db.bundle.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    candidate = `${root}-${i}`;
  }
  return `${root}-${Date.now()}`;
}

export async function saveBundle(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const bundleId = formData.get("id")?.toString() || null;

  const parsed = bundleSchema.safeParse({
    ...Object.fromEntries(formData),
    productIds: formData.getAll("productIds").map(String).filter(Boolean),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const data = parsed.data;

  const existing = bundleId
    ? await db.bundle.findUnique({
        where: { id: bundleId },
        select: { coverImage: true, slug: true },
      })
    : null;

  if (bundleId && !existing) {
    return { ...empty, message: "Комплектът не е намерен." };
  }

  // Само физически книги могат да участват в комплект — дигиталните нямат
  // смисъл в пакет с доставка.
  const validProducts = await db.product.findMany({
    where: { id: { in: data.productIds }, type: "PHYSICAL" },
    select: { id: true },
  });

  if (validProducts.length < 2) {
    return {
      ok: false,
      message: "Комплектът трябва да съдържа поне 2 физически книги.",
      errors: { productIds: "Изберете поне 2 физически книги." },
    };
  }

  const cover = await handleUpload(
    formData.get("coverFile"),
    "covers",
    ALLOWED_IMAGE_TYPES,
    MAX_IMAGE_BYTES,
  );
  if (cover.error) {
    return { ...empty, message: cover.error, errors: { coverFile: cover.error } };
  }

  const slug = await uniqueBundleSlug(data.slug || data.title, bundleId ?? undefined);

  const payload = {
    slug,
    title: data.title,
    description: data.description,
    priceCents: data.priceCents,
    isPublished: data.isPublished,
    ...(cover.key ? { coverImage: cover.key } : {}),
  };

  let savedId: string;

  if (bundleId) {
    await db.bundle.update({ where: { id: bundleId }, data: payload });
    savedId = bundleId;
    if (cover.key && existing?.coverImage) await deleteFile(existing.coverImage);
    // Съставът се пренаписва изцяло — по-просто и по-предвидимо от сверяване.
    await db.bundleItem.deleteMany({ where: { bundleId } });
  } else {
    const created = await db.bundle.create({ data: payload });
    savedId = created.id;
  }

  await db.bundleItem.createMany({
    data: validProducts.map((p) => ({
      bundleId: savedId,
      productId: p.id,
      quantity: 1,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/admin/komplekti");
  revalidatePath("/knigi");

  return { ok: true, message: "Комплектът е запазен." };
}

export async function deleteBundle(bundleId: string): Promise<AdminState> {
  await requireAdmin();

  const bundle = await db.bundle.findUnique({
    where: { id: bundleId },
    select: {
      coverImage: true,
      _count: { select: { orderItems: true } },
    },
  });

  if (!bundle) return { ...empty, message: "Комплектът не е намерен." };

  // Комплект с направени поръчки само се скрива — историята трябва да остане.
  if (bundle._count.orderItems > 0) {
    await db.bundle.update({
      where: { id: bundleId },
      data: { isPublished: false },
    });
    revalidatePath("/admin/komplekti");
    revalidatePath("/knigi");
    return {
      ok: true,
      message: "Комплектът има поръчки, затова беше скрит вместо изтрит.",
    };
  }

  await db.bundle.delete({ where: { id: bundleId } });
  if (bundle.coverImage) await deleteFile(bundle.coverImage);

  revalidatePath("/admin/komplekti");
  revalidatePath("/knigi");
  return { ok: true, message: "Комплектът е изтрит." };
}

export async function toggleBundlePublished(bundleId: string): Promise<AdminState> {
  await requireAdmin();

  const bundle = await db.bundle.findUnique({
    where: { id: bundleId },
    select: { isPublished: true },
  });
  if (!bundle) return { ...empty, message: "Комплектът не е намерен." };

  await db.bundle.update({
    where: { id: bundleId },
    data: { isPublished: !bundle.isPublished },
  });

  revalidatePath("/admin/komplekti");
  revalidatePath("/knigi");
  return {
    ok: true,
    message: bundle.isPublished ? "Комплектът е скрит." : "Комплектът е публикуван.",
  };
}
