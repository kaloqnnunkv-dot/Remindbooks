import type { Metadata, Viewport } from "next";
import { Libre_Baskerville, Lora, IBM_Plex_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

import { auth } from "@/lib/auth";
import { cartCount } from "@/lib/cart";
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
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-libre-baskerville",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-lora",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
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
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "Remind Books" }],
  },
  icons: {
    icon: [{ url: "/logo-mark.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-image.jpg"] },
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f1e6" },
    { media: "(prefers-color-scheme: dark)", color: "#2d2621" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [session, count] = await Promise.all([auth(), cartCount()]);

  return (
    <html
      lang="bg"
      className={`${libreBaskerville.variable} ${lora.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col antialiased">
        <SessionProvider session={session}>
          <ToastProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-3 focus:left-3 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md focus:font-sans focus:text-sm"
            >
              Към основното съдържание
            </a>

            <SiteHeader cartCount={count} isLoggedIn={Boolean(session?.user)} />

            <main id="main" className="flex-1">
              {children}
            </main>

            <SiteFooter />
            <SocialWidgets />
            <CookieConsent />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
