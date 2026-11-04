import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Nunito, IBM_Plex_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import "./compass.css";

import { auth } from "@/lib/auth";
import { cartCount } from "@/lib/cart";
import { getSiteImages } from "@/lib/images";
import { DAY_BOOT_SCRIPT } from "@/lib/daylight";
import { DaylightProvider } from "@/components/daylight";
import { env } from "@/lib/env";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CookieConsent } from "@/components/cookie-consent";
import { SocialWidgets } from "@/components/social-widgets";
import { ToastProvider } from "@/components/toast";

/**
 * Шрифтовете се сервират от собствения домейн (next/font ги сваля при build),
 * което е и по-бързо, и по-чисто откъм GDPR — няма заявки към Google при
 * зареждане на страницата.
 */
/** Заглавията — „Компас на деня“. */
const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

/** Текстът и интерфейсът. */
const nunito = Nunito({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

/**
 * Метаданните се строят при заявка, а не са постоянни: снимката за споделяне
 * може да бъде подменена от админ панела и адресът ѝ се чете от базата.
 */
export async function generateMetadata(): Promise<Metadata> {
  const images = await getSiteImages();
  return {
    metadataBase: new URL(env.appUrl),
    title: {
      default: "Remind Books — книги, които връщат посоката",
      template: "%s | Remind Books",
    },
    description:
      "Физически и дигитални книги, аудио медитации и вдъхновяващо съдържание. Открийте своя вътрешен компас с Remind Books.",
    keywords: [
      "книги",
      "PDF книги",
      "аудио книги",
      "медитации",
      "саморазвитие",
      "Remind Books",
    ],
    authors: [{ name: "Remind Books" }],
    openGraph: {
      type: "website",
      locale: "bg_BG",
      siteName: "Remind Books",
      title: "Remind Books — книги, които връщат посоката",
      description:
        "Физически и дигитални книги, аудио медитации и вдъхновяващо съдържание.",
      images: [{ url: images.ogImage, width: 1200, height: 630, alt: "Remind Books" }],
    },
    icons: {
      icon: [{ url: "/logo-mark.png", type: "image/png" }],
      apple: [{ url: "/apple-icon.png" }],
    },
    twitter: { card: "summary_large_image", images: [images.ogImage] },
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#070a14" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, count, images] = await Promise.all([
    auth(),
    cartCount(),
    getSiteImages(),
  ]);

  // Цветовете от „Оформление“ в админ панела вече не се вграждат: палитрата
  // следва часа от деня (четири фази в globals.css) и една фиксирана палитра
  // би я спряла. Запазените стойности остават в базата непокътнати.

  return (
    <html
      lang="bg"
      className={`${cormorant.variable} ${nunito.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Задава фазата на деня по местния час, преди страницата да се
            изчертае — иначе нощем първо проблясваше дневната палитра. */}
        <script dangerouslySetInnerHTML={{ __html: DAY_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-screen antialiased">
        <SessionProvider session={session}>
          <ToastProvider>
            <DaylightProvider>
              <div className="rb-page flex min-h-screen flex-col">
                <a
                  href="#main"
                  className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-full focus:font-sans focus:text-sm"
                >
                  Към основното съдържание
                </a>

                <SiteHeader
                  cartCount={count}
                  isLoggedIn={Boolean(session?.user)}
                  logoSrc={images.logo}
                />

                <main id="main" className="flex-1">
                  {children}
                </main>

                <SiteFooter logoSrc={images.logo} />

                {/* Вътре в .rb-page, за да делят един z-index слой с менюто и
                    прозорците — иначе изскачаха над тях. */}
                <SocialWidgets />
                <CookieConsent />
              </div>
            </DaylightProvider>
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
