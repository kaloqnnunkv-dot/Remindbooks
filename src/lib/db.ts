import { PrismaClient } from "@prisma/client";

/**
 * В development Next.js презарежда модулите при всяка промяна, което би създало
 * нов PrismaClient (и нов pool от връзки) на всеки hot reload. Кешираме го глобално.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
