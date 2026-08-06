import { z } from "zod";

/** Български телефонен номер — приема 0888..., +359888..., с интервали/тирета. */
const phoneRegex = /^(\+359|0)\s?8[7-9]\d(\s?\d{3}){2}$|^(\+359|0)\s?\d{8,9}$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Моля, въведете имейл адрес.")
  .email("Невалиден имейл адрес.")
  .max(254)
  .transform((v) => v.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, "Паролата трябва да е поне 8 символа.")
  .max(200, "Паролата е твърде дълга.");

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Моля, въведете име.").max(100),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z
      .union([z.literal("on"), z.literal("true"), z.boolean()])
      .refine((v) => v === "on" || v === "true" || v === true, {
        message: "Трябва да приемете Общите условия.",
      }),
    newsletter: z.union([z.literal("on"), z.literal("true"), z.boolean()]).optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Паролите не съвпадат.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Моля, въведете парола."),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Паролите не съвпадат.",
    path: ["confirmPassword"],
  });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Моля, въведете име.").max(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .refine((v) => !v || phoneRegex.test(v), "Невалиден телефонен номер."),
  addressLine: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  postalCode: z.string().trim().max(20).optional(),
});

export const shippingSchema = z.object({
  firstName: z.string().trim().min(2, "Моля, въведете име.").max(60),
  lastName: z.string().trim().min(2, "Моля, въведете фамилия.").max(60),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .min(1, "Моля, въведете телефон.")
    .refine((v) => phoneRegex.test(v), "Невалиден телефонен номер."),
  addressLine: z.string().trim().min(5, "Моля, въведете адрес.").max(200),
  city: z.string().trim().min(2, "Моля, въведете град.").max(100),
  postalCode: z.string().trim().min(4, "Моля, въведете пощенски код.").max(20),
  notes: z.string().trim().max(1000).optional(),
  paymentMethod: z.enum(["CARD", "COD"]),
  promoCode: z.string().trim().max(50).optional(),
  giftCardCode: z.string().trim().max(50).optional(),
  acceptTerms: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .refine((v) => v === "on" || v === "true" || v === true, {
      message: "Трябва да приемете Общите условия.",
    }),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Моля, въведете име.").max(100),
  email: emailSchema,
  subject: z.string().trim().max(150).optional(),
  body: z
    .string()
    .trim()
    .min(10, "Съобщението трябва да е поне 10 символа.")
    .max(4000, "Съобщението е твърде дълго."),
  // Honeypot — скрито поле, което ботовете попълват.
  website: z.string().max(0).optional(),
});

export const newsletterSchema = z.object({
  email: emailSchema,
  source: z.string().max(40).optional(),
  website: z.string().max(0).optional(),
});

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Моля, изберете оценка.").max(5),
  title: z.string().trim().max(120).optional(),
  body: z
    .string()
    .trim()
    .min(10, "Ревюто трябва да е поне 10 символа.")
    .max(2000, "Ревюто е твърде дълго."),
});

export const commentSchema = z.object({
  postId: z.string().min(1),
  authorName: z.string().trim().min(2, "Моля, въведете име.").max(80),
  authorEmail: emailSchema,
  body: z
    .string()
    .trim()
    .min(5, "Коментарът е твърде кратък.")
    .max(2000, "Коментарът е твърде дълъг."),
  website: z.string().max(0).optional(),
});

// ------------------------------------------------------------------
// Админ схеми
// ------------------------------------------------------------------

/** Приема "24,90" или "24.90" и връща стотинки. */
export const priceToCents = z
  .string()
  .trim()
  .min(1, "Моля, въведете цена.")
  .transform((v) => v.replace(",", "."))
  .pipe(z.coerce.number().min(0, "Цената не може да е отрицателна.").max(100000))
  .transform((v) => Math.round(v * 100));

export const optionalPriceToCents = z
  .string()
  .trim()
  .transform((v) => (v === "" ? undefined : v.replace(",", ".")))
  .pipe(z.coerce.number().min(0).max(100000).optional())
  .transform((v) => (v === undefined ? undefined : Math.round(v * 100)));

const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal(""), z.boolean(), z.undefined()])
  .transform((v) => v === "on" || v === "true" || v === true);

export const productSchema = z.object({
  type: z.enum(["PHYSICAL", "PDF", "AUDIO"]),
  title: z.string().trim().min(2, "Моля, въведете заглавие.").max(200),
  slug: z.string().trim().max(100).optional(),
  author: z.string().trim().max(120).optional(),
  description: z.string().trim().min(1, "Моля, въведете описание.").max(20000),
  shortDesc: z.string().trim().max(500).optional(),
  priceCents: priceToCents,
  compareAtCents: optionalPriceToCents,
  stock: z.coerce.number().int().min(0).max(100000).default(0),
  lowStockAlert: z.coerce.number().int().min(0).max(1000).default(3),
  durationSeconds: z.coerce.number().int().min(0).max(360000).optional(),
  previewPages: z.coerce.number().int().min(0).max(100).default(0),
  categoryId: z.string().optional(),
  isPublished: checkbox,
  isFeatured: checkbox,
  isBestseller: checkbox,
  isFree: checkbox,
  metaTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(200).optional(),
  relatedIds: z.array(z.string()).optional(),
  /** ID-та на съществуващи снимки от галерията, отбелязани за премахване. */
  removeImageIds: z.array(z.string()).optional(),
});

export const bundleSchema = z.object({
  title: z.string().trim().min(2, "Моля, въведете заглавие.").max(200),
  slug: z.string().trim().max(100).optional(),
  description: z.string().trim().min(1, "Моля, въведете описание.").max(5000),
  priceCents: priceToCents,
  isPublished: checkbox,
  productIds: z
    .array(z.string())
    .min(2, "Комплектът трябва да съдържа поне 2 заглавия."),
});

export const postSchema = z.object({
  title: z.string().trim().min(2, "Моля, въведете заглавие.").max(200),
  slug: z.string().trim().max(100).optional(),
  excerpt: z.string().trim().max(500).optional(),
  body: z.string().trim().min(1, "Съдържанието не може да е празно.").max(200000),
  isPublished: checkbox,
  metaTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(200).optional(),
  tags: z.string().trim().max(300).optional(),
});

export const promoCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, "Кодът трябва да е поне 3 символа.")
      .max(40)
      .regex(/^[A-Za-z0-9_-]+$/, "Позволени са само букви, цифри, тире и долна черта.")
      .transform((v) => v.toUpperCase()),
    discountType: z.enum(["PERCENT", "FIXED"]),
    amountRaw: z.string().trim().min(1, "Моля, въведете стойност."),
    minOrderCents: optionalPriceToCents,
    startsAt: z.string().trim().optional(),
    expiresAt: z.string().trim().optional(),
    maxUses: z
      .string()
      .trim()
      .transform((v) => (v === "" ? undefined : v))
      .pipe(z.coerce.number().int().min(1).max(1000000).optional()),
    isActive: checkbox,
    description: z.string().trim().max(200).optional(),
  })
  .transform((d) => {
    const numeric = Number(d.amountRaw.replace(",", "."));
    return {
      ...d,
      amount:
        d.discountType === "PERCENT"
          ? Math.round(numeric)
          : Math.round(numeric * 100),
    };
  })
  .refine(
    (d) =>
      d.discountType === "PERCENT"
        ? d.amount >= 1 && d.amount <= 100
        : d.amount > 0,
    { message: "Невалидна стойност на отстъпката.", path: ["amountRaw"] },
  );

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Моля, въведете име.").max(80),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export const giftCardSchema = z.object({
  amountCents: priceToCents,
  recipientEmail: emailSchema,
  recipientName: z.string().trim().max(100).optional(),
  message: z.string().trim().max(500).optional(),
});

export const orderStatusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PENDING", "PAID", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED"]),
  trackingNumber: z.string().trim().max(80).optional(),
  notifyCustomer: z
    .union([z.literal("on"), z.literal("true"), z.boolean(), z.undefined()])
    .transform((v) => v === "on" || v === "true" || v === true),
});

/** Превръща ZodError в обект { поле: съобщение } за показване във формата. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
