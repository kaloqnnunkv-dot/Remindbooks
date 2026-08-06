import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { env } from "./env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// Провайдърите се събират в масив с общия тип на NextAuth, за да може
// Google да бъде добавен условно (само когато има конфигурирани ключове).
const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Имейл", type: "email" },
      password: { label: "Парола", type: "password" },
    },
    async authorize(raw) {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const email = parsed.data.email.toLowerCase().trim();
      const user = await db.user.findUnique({ where: { email } });

      // Потребител, регистриран само през Google, няма passwordHash.
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
      if (!ok) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      };
    },
  }),
];

if (env.auth.googleId && env.auth.googleSecret) {
  providers.push(
    Google({
      clientId: env.auth.googleId,
      clientSecret: env.auth.googleSecret,
      // Позволява свързване на Google профил със съществуващ акаунт със същия
      // имейл — иначе потребител, регистриран с парола, не може да влезе с Google.
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  // JWT сесии — Credentials провайдърът не поддържа database сесии.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  secret: env.auth.secret,
  trustHost: true,
  pages: {
    signIn: "/vhod",
    error: "/vhod",
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      // При обновяване на профила презареждаме ролята от базата.
      if (trigger === "update" && token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, name: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.name = fresh.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
  events: {
    // При първи вход с Google — прехвърляме името и снимката.
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id! },
        data: { emailVerified: new Date() },
      });
    },
  },
});

/** Връща текущия потребител или null. */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

/** Хвърля, ако потребителят не е администратор. За използване в admin страници. */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    throw new Error("UNAUTHORIZED");
  }
  return session.user;
}

export async function isAdmin(): Promise<boolean> {
  const session = await auth();
  return session?.user?.role === "ADMIN";
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}
