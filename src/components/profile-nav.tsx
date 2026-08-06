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
      <ul className="space-y-1">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-md font-sans text-sm transition-colors",
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
          <li className="pt-2 mt-2 border-t border-border">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-md font-sans text-sm text-primary hover:bg-muted transition-colors"
            >
              <ChartIcon size={17} />
              Административен панел
            </Link>
          </li>
        )}

        <li className="pt-2 mt-2 border-t border-border">
          <form action={logoutUser}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md font-sans text-sm text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
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
