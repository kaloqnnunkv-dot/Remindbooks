import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Лични и служебни страници нямат място в индекса на Google.
      disallow: [
        "/admin",
        "/admin/",
        "/profil",
        "/profil/",
        "/checkout",
        "/checkout/",
        "/kolichka",
        "/api/",
        "/vhod",
        "/registracia",
        "/nova-parola",
        "/zabravena-parola",
        "/tarsene",
      ],
    },
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
