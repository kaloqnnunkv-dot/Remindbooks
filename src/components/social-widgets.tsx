"use client";

import { useState } from "react";
import { publicConfig } from "@/lib/public-config";
import { ChevronRightIcon, FacebookIcon, InstagramIcon, TikTokIcon } from "./icons";

/**
 * Изплуващи от страната на екрана уиджети за социални мрежи.
 *
 * Иконите носят цветовете на съответната мрежа още в покой — така се
 * разпознават от пръв поглед. Досега бяха бели до посочване с мишката, което
 * ги правеше практически невидими.
 *
 * На мобилни устройства заемат твърде много място, затова се показват само от
 * md нагоре — там потребителят достига социалните мрежи през footer-а.
 */
export function SocialWidgets() {
  const [collapsed, setCollapsed] = useState(false);

  const links = [
    {
      href: publicConfig.social.facebook,
      label: "Facebook",
      icon: <FacebookIcon size={20} />,
      // Фирмените цветове на мрежите се задават директно — те не са част от
      // палитрата на сайта и не бива да се менят с темата.
      style: { backgroundColor: "#1877f2", color: "#ffffff" },
    },
    {
      href: publicConfig.social.tiktok,
      label: "TikTok",
      icon: <TikTokIcon size={20} />,
      style: { backgroundColor: "#010101", color: "#ffffff" },
    },
    ...(publicConfig.social.instagram
      ? [
          {
            href: publicConfig.social.instagram,
            label: "Instagram",
            icon: <InstagramIcon size={20} />,
            style: {
              backgroundImage:
                "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
              color: "#ffffff",
            },
          },
        ]
      : []),
  ];

  return (
    <div
      className={`hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 flex-col transition-transform duration-300 ${
        collapsed ? "-translate-x-[calc(100%-16px)]" : ""
      }`}
    >
      <div className="flex flex-col gap-1">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={l.label}
            title={l.label}
            style={l.style}
            className="group flex h-12 w-12 items-center justify-center overflow-hidden rounded-r-md shadow-soft transition-all duration-200 hover:w-36 hover:justify-start hover:pl-3.5 hover:shadow-lift"
          >
            <span className="shrink-0">{l.icon}</span>
            <span className="ml-2.5 whitespace-nowrap font-sans text-sm font-bold opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              {l.label}
            </span>
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Покажи социалните мрежи" : "Скрий социалните мрежи"}
        className="mt-1 flex h-6 w-12 items-center justify-center rounded-r-md border border-l-0 border-border bg-card text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronRightIcon
          size={14}
          className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
