"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartIcon,
  BookIcon,
  PackageIcon,
  InboxIcon,
  UsersIcon,
  TagIcon,
  GiftIcon,
  SettingsIcon,
  FileTextIcon,
  ImageIcon,
} from "../icons";
import { cn } from "../ui";

const GROUPS: {
  title: string;
  links: { href: string; label: string; icon: typeof ChartIcon; exact?: boolean }[];
}[] = [
  {
    title: "Общ преглед",
    links: [
      { href: "/admin", label: "Табло", icon: ChartIcon, exact: true },
      { href: "/admin/analizi", label: "Анализи", icon: ChartIcon },
    ],
  },
  {
    title: "Магазин",
    links: [
      { href: "/admin/produkti", label: "Продукти", icon: BookIcon },
      { href: "/admin/komplekti", label: "Комплекти", icon: PackageIcon },
      { href: "/admin/nalichnosti", label: "Наличности", icon: PackageIcon },
      { href: "/admin/porachki", label: "Поръчки", icon: InboxIcon },
      { href: "/admin/promo", label: "Промо кодове", icon: TagIcon },
      { href: "/admin/podaruchni-karti", label: "Подаръчни карти", icon: GiftIcon },
    ],
  },
  {
    title: "Съдържание",
    links: [
      { href: "/admin/blog", label: "Блог", icon: FileTextIcon },
      { href: "/admin/komentari", label: "Коментари", icon: InboxIcon },
      { href: "/admin/sabshtenia", label: "Съобщения", icon: InboxIcon },
    ],
  },
  {
    title: "Хора",
    links: [
      { href: "/admin/potrebiteli", label: "Потребители", icon: UsersIcon },
      { href: "/admin/byuletin", label: "Бюлетин", icon: UsersIcon },
    ],
  },
  {
    title: "Настройки",
    links: [
      { href: "/admin/oformlenie", label: "Оформление", icon: ImageIcon },
      { href: "/admin/nastroyki", label: "Настройки", icon: SettingsIcon },
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Административна навигация" className="space-y-5">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="px-3 mb-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {group.title}
          </p>
          <ul className="space-y-0.5">
            {group.links.map((link) => {
              const active = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);
              const Icon = link.icon;

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-md font-sans text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-bold"
                        : "text-foreground/80 hover:bg-muted",
                    )}
                  >
                    <Icon size={16} />
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="pt-4 border-t border-border">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-md font-sans text-sm text-muted-foreground hover:bg-muted transition-colors"
        >
          ← Към сайта
        </Link>
      </div>
    </nav>
  );
}
