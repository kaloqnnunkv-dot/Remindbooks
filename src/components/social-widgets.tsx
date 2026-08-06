"use client";

import { useState } from "react";
import { publicConfig } from "@/lib/public-config";
import { ChevronRightIcon, FacebookIcon, InstagramIcon, TikTokIcon } from "./icons";

/**
 * Изплуващи от страната на екрана уиджети за социални мрежи.
 *
 * На мобилни устройства заемат твърде много място, затова се показват само от
 * md нагоре — там потребителят и без това достига социалните мрежи през footer-а.
 */
export function SocialWidgets() {
  const [collapsed, setCollapsed] = useState(false);

  const links = [
    {
      href: publicConfig.social.facebook,
      label: "Facebook",
      icon: <FacebookIcon size={20} />,
      className: "hover:bg-[#1877f2] hover:text-white hover:border-[#1877f2]",
    },
    {
      href: publicConfig.social.tiktok,
      label: "TikTok",
      icon: <TikTokIcon size={20} />,
      className: "hover:bg-[#010101] hover:text-white hover:border-[#010101]",
    },
    ...(publicConfig.social.instagram
      ? [
          {
            href: publicConfig.social.instagram,
            label: "Instagram",
            icon: <InstagramIcon size={20} />,
            className: "hover:bg-[#c13584] hover:text-white hover:border-[#c13584]",
          },
        ]
      : []),
  ];

  return (
    <div
      className={`hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-30 flex-col transition-transform duration-300 ${
        collapsed ? "-translate-x-[calc(100%-14px)]" : ""
      }`}
    >
      <div className="flex flex-col gap-px">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={l.label}
            title={l.label}
            className={`group flex items-center h-11 w-11 justify-center bg-card border border-border border-l-0 first:rounded-tr-md last:rounded-br-md transition-all duration-200 hover:w-32 hover:justify-start hover:pl-3 ${l.className}`}
          >
            {l.icon}
            <span className="ml-2 font-sans text-xs font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {l.label}
            </span>
          </a>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Покажи социалните мрежи" : "Скрий социалните мрежи"}
        className="mt-px h-6 w-11 flex items-center justify-center bg-muted border border-border border-l-0 rounded-br-md text-muted-foreground hover:text-primary transition-colors"
      >
        <ChevronRightIcon
          size={14}
          className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
