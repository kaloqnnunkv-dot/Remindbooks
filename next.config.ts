import type { NextConfig } from "next";

/**
 * Хостовете, от които се зареждат изображения, се задават чрез променливата
 * NEXT_PUBLIC_MEDIA_HOST (например CDN домейна на S3/R2 bucket-а).
 */
const mediaHost = process.env.NEXT_PUBLIC_MEDIA_HOST;

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: mediaHost
      ? [{ protocol: "https", hostname: mediaHost.replace(/^https?:\/\//, "") }]
      : [],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      /**
       * Административният панел качва PDF и аудио файлове през Server Actions,
       * затова лимитът трябва да е по-висок от най-големия допустим файл
       * (виж MAX_MEDIA_BYTES в src/lib/storage.ts).
       *
       * Забележка: Server Actions буферират цялото тяло в паметта. При нужда от
       * значително по-големи файлове (видео над 300 MB) правилният подход е
       * качване директно към хранилището с предварително подписан URL, което
       * заобикаля сървъра на приложението.
       */
      bodySizeLimit: "320mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
