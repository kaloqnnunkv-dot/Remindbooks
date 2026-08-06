"use server";

import { randomBytes } from "node:crypto";
import { AuthError } from "next-auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { signIn, signOut, auth, hashPassword } from "@/lib/auth";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileSchema,
  fieldErrors,
} from "@/lib/validation";
import { sendPasswordReset } from "@/lib/email";
import { limitByIp } from "@/lib/rate-limit";
import { subscribeToMailerLite } from "@/lib/mailerlite";

export type AuthState = {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
};

const empty: AuthState = { ok: false, message: "" };

/** Безопасен redirect — приемаме само вътрешни пътища, за да няма open redirect. */
function safeRedirect(target: string | null | undefined): string {
  if (!target) return "/profil";
  if (!target.startsWith("/") || target.startsWith("//")) return "/profil";
  return target;
}

// ------------------------------------------------------------------
// Регистрация
// ------------------------------------------------------------------

export async function registerUser(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const limit = await limitByIp("register", 5, 900);
  if (!limit.ok) {
    return { ...empty, message: "Твърде много опити. Опитайте отново след малко." };
  }

  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const { name, email, password, newsletter } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true },
  });

  if (existing) {
    // Профил, създаден през Google, все още няма парола — позволяваме да я зададе.
    if (!existing.passwordHash) {
      await db.user.update({
        where: { id: existing.id },
        data: { passwordHash: await hashPassword(password), name },
      });
    } else {
      return {
        ok: false,
        message: "Вече съществува профил с този имейл.",
        errors: { email: "Този имейл вече е регистриран." },
      };
    }
  } else {
    await db.user.create({
      data: {
        name,
        email,
        passwordHash: await hashPassword(password),
        newsletterOptIn: Boolean(newsletter),
      },
    });
  }

  if (newsletter) {
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: { email, isConfirmed: true, source: "registration" },
      update: { isConfirmed: true, unsubscribedAt: null },
    });
    await subscribeToMailerLite(email, { name });
  }

  // Автоматичен вход след регистрация — по-малко триене за потребителя.
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch {
    return {
      ok: true,
      message: "Профилът е създаден. Моля, влезте с новите си данни.",
    };
  }

  redirect("/profil");
}

// ------------------------------------------------------------------
// Вход
// ------------------------------------------------------------------

export async function loginUser(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const limit = await limitByIp("login", 10, 900);
  if (!limit.ok) {
    return { ...empty, message: "Твърде много опити за вход. Опитайте по-късно." };
  }

  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const target = safeRedirect(formData.get("redirect")?.toString());

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      // Нарочно едно и също съобщение за грешен имейл и грешна парола —
      // иначе формата издава кои имейли са регистрирани.
      return { ...empty, message: "Грешен имейл или парола." };
    }
    throw error;
  }

  redirect(target);
}

export async function logoutUser() {
  await signOut({ redirectTo: "/" });
}

// ------------------------------------------------------------------
// Забравена парола
// ------------------------------------------------------------------

export async function requestPasswordReset(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const limit = await limitByIp("reset-request", 5, 900);
  if (!limit.ok) {
    return { ...empty, message: "Твърде много заявки. Опитайте по-късно." };
  }

  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, въведете валиден имейл адрес.",
      errors: fieldErrors(parsed.error),
    };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  // Отговорът е еднакъв независимо дали имейлът съществува — за да не може
  // формата да се използва за проверка кои адреси са регистрирани.
  const genericMessage =
    "Ако съществува профил с този имейл, изпратихме линк за смяна на паролата.";

  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expires: new Date(Date.now() + 60 * 60 * 1000), // 1 час
      },
    });
    await sendPasswordReset(parsed.data.email, token);
  }

  return { ok: true, message: genericMessage };
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  const record = await db.passwordResetToken.findUnique({
    where: { token: parsed.data.token },
    select: { id: true, userId: true, expires: true, usedAt: true },
  });

  if (!record || record.usedAt || record.expires < new Date()) {
    return {
      ...empty,
      message: "Линкът е невалиден или е изтекъл. Моля, заявете нов.",
    };
  }

  await db.$transaction([
    db.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    db.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    // Всички други неизползвани токени за този потребител стават невалидни.
    db.passwordResetToken.updateMany({
      where: { userId: record.userId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    ok: true,
    message: "Паролата е сменена успешно. Вече можете да влезете.",
  };
}

// ------------------------------------------------------------------
// Профил
// ------------------------------------------------------------------

export async function updateProfile(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ...empty, message: "Нямате достъп." };
  }

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Моля, поправете грешките във формата.",
      errors: fieldErrors(parsed.error),
    };
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      addressLine: parsed.data.addressLine || null,
      city: parsed.data.city || null,
      postalCode: parsed.data.postalCode || null,
    },
  });

  revalidatePath("/profil/nastroyki");
  return { ok: true, message: "Данните са запазени." };
}

export async function changePassword(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const session = await auth();
  if (!session?.user?.id) return { ...empty, message: "Нямате достъп." };

  const current = formData.get("currentPassword")?.toString() ?? "";
  const next = formData.get("password")?.toString() ?? "";
  const confirm = formData.get("confirmPassword")?.toString() ?? "";

  if (next.length < 8) {
    return {
      ok: false,
      message: "Паролата трябва да е поне 8 символа.",
      errors: { password: "Паролата трябва да е поне 8 символа." },
    };
  }
  if (next !== confirm) {
    return {
      ok: false,
      message: "Паролите не съвпадат.",
      errors: { confirmPassword: "Паролите не съвпадат." },
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  });

  // Потребител, влязъл само с Google, няма текуща парола — задава си направо.
  if (user?.passwordHash) {
    const bcrypt = await import("bcryptjs");
    const valid = await bcrypt.compare(current, user.passwordHash);
    if (!valid) {
      return {
        ok: false,
        message: "Текущата парола е грешна.",
        errors: { currentPassword: "Текущата парола е грешна." },
      };
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await hashPassword(next) },
  });

  return { ok: true, message: "Паролата е сменена." };
}

export async function toggleNewsletterOptIn(
  optIn: boolean,
): Promise<AuthState> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ...empty, message: "Нямате достъп." };
  }

  const email = session.user.email;

  await db.user.update({
    where: { id: session.user.id },
    data: { newsletterOptIn: optIn },
  });

  if (optIn) {
    await db.newsletterSubscriber.upsert({
      where: { email },
      create: { email, isConfirmed: true, source: "profile" },
      update: { isConfirmed: true, unsubscribedAt: null },
    });
    await subscribeToMailerLite(email, { name: session.user.name ?? undefined });
  } else {
    await db.newsletterSubscriber.updateMany({
      where: { email },
      data: { unsubscribedAt: new Date() },
    });
  }

  revalidatePath("/profil/nastroyki");
  return {
    ok: true,
    message: optIn ? "Абонирахте се за бюлетина." : "Отписахте се от бюлетина.",
  };
}
