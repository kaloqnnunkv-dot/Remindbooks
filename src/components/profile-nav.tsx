"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutUser } from "@/app/actions/auth";
import {
  BookIcon,
  HeartIcon,
  LogoutIcon,
  PackageIcon,
  SettingsIcon,
  ChartIcon,
} from "./icons";
import { cn } from "./ui";

const LINKS = [
  { href: "/profil", label: "Преглед", icon: PackageIcon, exact: true },
  { href: "/profil/porachki", label: "Моите поръчки", icon: PackageIcon },
  { href: "/profil/moite-knigi", label: "Моите книги", icon: BookIcon },
  { href: "/profil/lyubimi", label: "Любими", icon: HeartIcon },
  { href: "/profil/nastroyki", label: "Настройки", icon: SettingsIcon },
];

export function ProfileNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Навигация в профила">
      <ul className="max-lg:grid max-lg:grid-cols-2 max-lg:gap-2 lg:space-y-1 max-lg:[&>li:last-child:nth-child(odd)]:col-span-2">
        {LINKS.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-sans text-sm transition-colors max-lg:h-full max-lg:border max-lg:border-border",
                  active
                    ? "bg-primary text-primary-foreground font-bold"
                    : "text-foreground/80 hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon size={17} />
                {link.label}
              </Link>
            </li>
          );
        })}

        {isAdmin && (
          <li className="lg:pt-2 lg:mt-2 lg:border-t lg:border-border">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-sans text-sm text-primary hover:bg-muted transition-colors max-lg:h-full max-lg:border max-lg:border-border"
            >
              <ChartIcon size={17} />
              Административен панел
            </Link>
          </li>
        )}

        <li className="lg:pt-2 lg:mt-2 lg:border-t lg:border-border">
          <form action={logoutUser} className="max-lg:h-full">
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-sans text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors max-lg:h-full max-lg:border max-lg:border-border"
            >
              <LogoutIcon size={17} />
              Изход
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
