import "server-only";
import { headers } from "next/headers";

/**
 * Прост in-memory rate limiter за формите (контакт, бюлетин, вход, регистрация).
 *
 * Достатъчен за сайт на един сървър. При хоризонтално мащабиране (няколко
 * инстанции) този модул трябва да се замени с Redis/Upstash — интерфейсът
 * е нарочно семпъл, за да е лесна подмяната.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// Периодично чистене, за да не расте паметта неограничено.
const CLEANUP_INTERVAL = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(now: number) {
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Взима IP адреса на клиента, съобразявайки се с reverse proxy заглавията. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "unknown";
}

/** Комбинира IP и действие в ключ и прилага лимита. */
export async function limitByIp(
  action: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const ip = await clientIp();
  return rateLimit(`${action}:${ip}`, limit, windowSeconds);
}
