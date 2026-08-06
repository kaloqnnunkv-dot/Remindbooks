import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env, isStorageConfigured } from "./env";

/**
 * Абстракция над хранилището за файлове.
 *
 * Поддържат се два режима:
 *  1. S3-съвместимо хранилище (Cloudflare R2, Backblaze B2, AWS S3, MinIO) —
 *     препоръчително за production, защото аудио/видео се раздават през CDN
 *     и не натоварват сървъра на приложението.
 *  2. Локална папка (LOCAL_UPLOAD_DIR) — за локална разработка или Railway
 *     volume. Файловете се раздават през /api/media.
 *
 * Кориците са публични. PDF и аудио файловете НЕ са публични — достъпът минава
 * през подписан временен URL или през стрийминг endpoint, който проверява дали
 * потребителят е закупил продукта.
 */

const s3 = isStorageConfigured
  ? new S3Client({
      region: env.storage.region,
      endpoint: env.storage.endpoint,
      // R2 и MinIO изискват path-style адресиране
      forcePathStyle: Boolean(env.storage.endpoint),
      credentials: {
        accessKeyId: env.storage.accessKeyId!,
        secretAccessKey: env.storage.secretAccessKey!,
      },
    })
  : null;

export type UploadFolder = "covers" | "pdf" | "audio" | "blog" | "previews";

/** Генерира уникален ключ, запазвайки разширението на файла. */
export function makeKey(folder: UploadFolder, filename: string): string {
  const ext = path.extname(filename).toLowerCase().slice(0, 10);
  return `${folder}/${randomUUID()}${ext}`;
}

function localPathFor(key: string): string {
  return path.join(process.cwd(), env.storage.localDir, key);
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.storage.bucket!,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  const dest = localPathFor(key);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, body);
  return key;
}

export async function deleteFile(key: string): Promise<void> {
  if (!key) return;
  try {
    if (s3) {
      await s3.send(
        new DeleteObjectCommand({ Bucket: env.storage.bucket!, Key: key }),
      );
    } else {
      await fs.unlink(localPathFor(key));
    }
  } catch {
    // Липсващ файл не е грешка при изтриване на продукт.
  }
}

/**
 * Публичен URL за корици и други некритични файлове.
 *
 * NEXT_PUBLIC_MEDIA_HOST се приема и със, и без протокол — в интерфейсите на
 * Cloudflare адресът се показва ту като `media.example.com`, ту като
 * `https://pub-xxxx.r2.dev`. Без нормализация стойност без протокол дава
 * относителен адрес и всички изображения се чупят.
 */
export function publicUrl(key?: string | null): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;

  if (env.storage.publicUrl) {
    const raw = env.storage.publicUrl.trim().replace(/\/+$/, "");
    const base = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return `${base}/${key.replace(/^\/+/, "")}`;
  }

  return `/api/media/${key}`;
}

/**
 * Временен подписан URL за защитен файл (PDF/аудио). Валиден по подразбиране
 * 15 минути — достатъчно за сваляне, твърде малко за споделяне.
 */
export async function signedDownloadUrl(
  key: string,
  expiresInSeconds = 900,
  downloadFilename?: string,
): Promise<string> {
  if (s3) {
    return getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: env.storage.bucket!,
        Key: key,
        ResponseContentDisposition: downloadFilename
          ? `attachment; filename="${encodeURIComponent(downloadFilename)}"`
          : undefined,
      }),
      { expiresIn: expiresInSeconds },
    );
  }
  // Локален режим: стриймва се през защитения endpoint.
  return `/api/media/${key}`;
}

/** Чете файл като поток — използва се от защитените endpoint-и в локален режим. */
export async function readFile(key: string): Promise<Buffer | null> {
  try {
    if (s3) {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: env.storage.bucket!, Key: key }),
      );
      const bytes = await res.Body?.transformToByteArray();
      return bytes ? Buffer.from(bytes) : null;
    }
    return await fs.readFile(localPathFor(key));
  } catch {
    return null;
  }
}

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

export function contentTypeFor(key: string): string {
  return CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];
export const ALLOWED_DOC_TYPES = ["application/pdf"];
export const ALLOWED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/ogg",
];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

/**
 * Лимити за качване.
 *
 * MAX_MEDIA_BYTES трябва да остане под `serverActions.bodySizeLimit` в
 * next.config.ts — Server Actions буферират цялото тяло в паметта.
 * 300 MB покриват аудиокнига от над 5 часа при типичен битрейт.
 */
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const MAX_DOC_BYTES = 100 * 1024 * 1024; // 100 MB
export const MAX_MEDIA_BYTES = 300 * 1024 * 1024; // 300 MB (аудио/видео)
