"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  CartIcon,
  CloseIcon,
  HeartIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "./icons";
import { LiveSearch } from "./live-search";
import { useDay } from "./daylight";
import { SiteLogo } from "./logo";
import { NEXT_STEP, PHASES, hhmm } from "@/lib/daylight";

const NAV = [
  { href: "/knigi", label: "Книги" },
  { href: "/pdf", label: "PDF книги" },
  { href: "/audio", label: "Аудио" },
  { href: "/blog", label: "Блог" },
  { href: "/za-nas", label: "За нас" },
  { href: "/kontakti", label: "Контакти" },
];

export function SiteHeader({
  cartCount,
  isLoggedIn,
  logoSrc,
}: {
  cartCount: number;
  isLoggedIn: boolean;
  /** Логото от админ панела. Идва отвън, защото това е клиентски компонент. */
  logoSrc?: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  // Затваряме менютата при навигация към нова страница.
  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Заключваме скрола, докато мобилното меню е отворено.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Ctrl/Cmd+K отваря търсачката — очаквано поведение за клавиатурни потребители.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      <header className="rb-nav">
        <div className="container-page">
          <div className="rb-navbar glass">
            <Link
              href="/"
              aria-label="Remind Books — начална страница"
              className="shrink-0 transition-opacity hover:opacity-80"
            >
              <SiteLogo src={logoSrc} />
            </Link>

            <nav className="rb-links" aria-label="Основна навигация">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="rb-nav-r">
              <DayClock />

              <button
                ref={searchButtonRef}
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Търсене"
                className="rb-icon"
              >
                <SearchIcon size={19} />
              </button>

              <Link
                href={isLoggedIn ? "/profil/lyubimi" : "/vhod"}
                aria-label="Любими"
                className="rb-icon max-sm:!hidden"
              >
                <HeartIcon size={19} />
              </Link>

              <Link
                href={isLoggedIn ? "/profil" : "/vhod"}
                aria-label={isLoggedIn ? "Моят профил" : "Вход"}
                className="rb-icon max-sm:!hidden"
              >
                <UserIcon size={19} />
              </Link>

              <Link
                href="/kolichka"
                aria-label={`Кошница (${cartCount} артикула)`}
                className="rb-icon solid"
              >
                <CartIcon size={19} />
                {cartCount > 0 && (
                  <span className="rb-cartn">{cartCount > 99 ? "99+" : cartCount}</span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Меню"
                aria-expanded={mobileOpen}
                className="rb-icon lg:!hidden"
              >
                {mobileOpen ? <CloseIcon size={19} /> : <MenuIcon size={19} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Мобилно меню */}
      {mobileOpen && (
        <div className="rb-mobile lg:hidden" role="dialog" aria-modal="true" aria-label="Меню">
          <div className="container-page pt-[14px]">
            <div className="rb-navbar glass">
              <SiteLogo src={logoSrc} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Затвори менюто"
                className="rb-icon"
              >
                <CloseIcon size={19} />
              </button>
            </div>
            <nav className="py-6" aria-label="Мобилна навигация">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              ))}
              <Link href={isLoggedIn ? "/profil/lyubimi" : "/vhod"}>Любими</Link>
              <Link href={isLoggedIn ? "/profil" : "/vhod"}>
                {isLoggedIn ? "Моят профил" : "Вход / Регистрация"}
              </Link>
            </nav>
          </div>
        </div>
      )}

      {searchOpen && <LiveSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}

/**
 * Часът в менюто. Показва часа, по който е подреден сайтът, и при натискане
 * прескача към следващата част от деня — сутрин, ден, вечер, нощ.
 */
function DayClock() {
  const { hour, phase, ready, goTo } = useDay();
  const t = hhmm(hour);
  const name = PHASES[phase].name;

  return (
    <button
      type="button"
      className="rb-clock"
      onClick={() => goTo(NEXT_STEP[phase], false)}
      aria-label={`${t}, ${name}. Смени часа от деня`}
      title="Смени часа от деня"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <b suppressHydrationWarning>{ready ? t : "--:--"}</b>
      <span>{ready ? name : ""}</span>
    </button>
  );
}
