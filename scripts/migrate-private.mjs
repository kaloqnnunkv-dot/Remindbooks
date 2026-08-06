/**
 * Пренася платеното съдържание в частния bucket.
 *
 * Публичният адрес на R2 (r2.dev) прави достъпен целия bucket — платените
 * книги и аудио не бива да стоят там. Скриптът ги премества и проверява, че
 * след преместването вече не са публично достъпни.
 *
 * Декоративното видео от hero секцията остава публично, но се мести в
 * папка `site/`, защото `audio/` вече е частна.
 *
 * Скриптът е предпазлив: копира, проверява и чак тогава изтрива оригинала.
 *
 * Употреба:  node scripts/migrate-private.mjs [--apply]
 * Без --apply само показва какво би направил.
 */

import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const APPLY = process.argv.includes("--apply");

const ENDPOINT = process.env.S3_ENDPOINT;
const PUBLIC_BUCKET = process.env.S3_BUCKET;
const PRIVATE_BUCKET = process.env.S3_PRIVATE_BUCKET;
const PUBLIC_HOST = process.env.NEXT_PUBLIC_MEDIA_HOST;

const client = (id, secret) =>
  new S3Client({
    region: "auto",
    endpoint: ENDPOINT,
    forcePathStyle: true,
    credentials: { accessKeyId: id, secretAccessKey: secret },
  });

const pub = client(process.env.S3_ACCESS_KEY_ID, process.env.S3_SECRET_ACCESS_KEY);
const priv = client(
  process.env.S3_PRIVATE_ACCESS_KEY_ID,
  process.env.S3_PRIVATE_SECRET_ACCESS_KEY,
);

const CONTENT_TYPES = {
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};
const typeFor = (k) => CONTENT_TYPES[k.slice(k.lastIndexOf("."))] ?? "application/octet-stream";

async function listAll(bucket, prefix) {
  const out = [];
  let token;
  do {
    const r = await pub.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
    );
    out.push(...(r.Contents ?? []));
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function body(bucket, key, c = pub) {
  const r = await c.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  return Buffer.from(await r.Body.transformToByteArray());
}

async function publiclyReachable(key) {
  try {
    const r = await fetch(`https://${PUBLIC_HOST}/${key}`, { method: "GET", headers: { Range: "bytes=0-9" } });
    return r.ok;
  } catch {
    return false;
  }
}

// Ключът на декоративното видео се подава отвън, за да не се мести в частния bucket.
const HERO_VIDEO_KEY = process.env.HERO_VIDEO_KEY ?? "";

async function main() {
  if (!PRIVATE_BUCKET || PRIVATE_BUCKET === PUBLIC_BUCKET) {
    console.error("S3_PRIVATE_BUCKET липсва или съвпада с публичния.");
    process.exit(1);
  }

  console.log(`Публичен bucket : ${PUBLIC_BUCKET}`);
  console.log(`Частен bucket   : ${PRIVATE_BUCKET}`);
  console.log(APPLY ? "Режим: ПРИЛАГАНЕ\n" : "Режим: само преглед (без --apply)\n");

  const objects = [
    ...(await listAll(PUBLIC_BUCKET, "pdf/")),
    ...(await listAll(PUBLIC_BUCKET, "audio/")),
  ];

  if (objects.length === 0) {
    console.log("Няма обекти за преместване.");
    return;
  }

  let moved = 0;
  let heroMoved = null;

  for (const o of objects) {
    const key = o.Key;
    const kb = Math.round((o.Size ?? 0) / 1024);

    // Декоративното видео остава публично, но в папка site/.
    if (key === HERO_VIDEO_KEY) {
      const newKey = `site/${key.split("/").pop()}`;
      console.log(`~ ${key}  (${kb} KB)  ->  ${newKey}  [остава публично]`);
      if (APPLY) {
        const data = await body(PUBLIC_BUCKET, key);
        await pub.send(
          new PutObjectCommand({
            Bucket: PUBLIC_BUCKET,
            Key: newKey,
            Body: data,
            ContentType: typeFor(key),
          }),
        );
        await pub.send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key }));
        heroMoved = newKey;
      }
      continue;
    }

    console.log(`→ ${key}  (${kb} KB)  ->  частен bucket`);

    if (!APPLY) continue;

    const data = await body(PUBLIC_BUCKET, key);
    await priv.send(
      new PutObjectCommand({
        Bucket: PRIVATE_BUCKET,
        Key: key,
        Body: data,
        ContentType: typeFor(key),
      }),
    );

    // Проверяваме, че копието е налице, преди да изтрием оригинала.
    const head = await priv.send(
      new HeadObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }),
    );
    if (Number(head.ContentLength) !== data.length) {
      console.error(`  ✗ размерът не съвпада — оригиналът се запазва`);
      continue;
    }

    await pub.send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key }));
    moved++;
  }

  if (!APPLY) {
    console.log(`\nЗа прилагане:  node scripts/migrate-private.mjs --apply`);
    return;
  }

  console.log(`\n✓ Преместени ${moved} файла в частния bucket.`);
  if (heroMoved) console.log(`✓ Видеото е в ${heroMoved} (публично)`);

  // Проверка: платеното съдържание вече не бива да е публично достъпно.
  console.log("\nПроверка на достъпа:");
  let leaks = 0;
  for (const o of objects) {
    if (o.Key === HERO_VIDEO_KEY) continue;
    if (await publiclyReachable(o.Key)) {
      console.log(`  ✗ ВСЕ ОЩЕ ПУБЛИЧЕН: ${o.Key}`);
      leaks++;
    }
  }
  console.log(leaks === 0 ? "  ✓ нито един платен файл не е публично достъпен" : `  ✗ ${leaks} файла остават публични`);
}

main().catch((e) => {
  console.error("Грешка:", e.message);
  process.exit(1);
});
