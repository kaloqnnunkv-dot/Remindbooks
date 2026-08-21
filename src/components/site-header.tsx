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
import { Logo } from "./logo";
import { cn } from "./ui";

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
      if (e.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="container-page">
          <div className="flex h-20 items-center justify-between gap-4">
            {/* Лого */}
            <Link
              href="/"
              aria-label="Remind Books — начална страница"
              className="shrink-0 transition-opacity hover:opacity-80"
            >
              <Logo width={240} priority src={logoSrc} className="h-[3.375rem] sm:h-[3.75rem]" />
            </Link>

            {/* Навигация — десктоп */}
            <nav className="hidden lg:flex items-center gap-1" aria-label="Основна навигация">
              {NAV.map((item) => {
                const active = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 font-sans text-sm rounded-md transition-colors",
                      active
                        ? "text-primary font-bold"
                        : "text-foreground/80 hover:text-primary hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Действия */}
            <div className="flex items-center gap-0.5">
              <button
                ref={searchButtonRef}
                type="button"
                onClick={() => setSearchOpen(true)}
                aria-label="Търсене"
                className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <SearchIcon />
              </button>

              <Link
                href={isLoggedIn ? "/profil/lyubimi" : "/vhod"}
                aria-label="Любими"
                className="hidden sm:inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <HeartIcon />
              </Link>

              <Link
                href={isLoggedIn ? "/profil" : "/vhod"}
                aria-label={isLoggedIn ? "Моят профил" : "Вход"}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <UserIcon />
              </Link>

              <Link
                href="/kolichka"
                aria-label={`Кошница (${cartCount} артикула)`}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                <CartIcon />
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-sans font-bold">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Меню"
                aria-expanded={mobileOpen}
                className="lg:hidden h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors"
              >
                {mobileOpen ? <CloseIcon /> : <MenuIcon />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Мобилно меню */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background">
          <div className="container-page">
            <div className="flex h-20 items-center justify-between">
              <span className="font-sans text-lg font-bold">Меню</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Затвори менюто"
                className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="py-4 flex flex-col" aria-label="Мобилна навигация">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="py-3.5 font-sans text-lg border-b border-border hover:text-primary transition-colors"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href={isLoggedIn ? "/profil" : "/vhod"}
                className="py-3.5 font-sans text-lg border-b border-border hover:text-primary transition-colors"
              >
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
