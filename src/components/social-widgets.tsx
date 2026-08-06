"use client";

import Image from "next/image";
import { useState } from "react";
import { publicConfig } from "@/lib/public-config";
import { ChevronRightIcon, InstagramIcon } from "./icons";

/**
 * Изплуващи от страната на екрана уиджети за социални мрежи.
 *
 * Използват се официалните лога на мрежите, а не пресъздадени икони — така
 * се разпознават мигновено и запазват точните си цветове и форма.
 * Логата вече съдържат собствен фон, затова бутонът е прозрачен.
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
      logo: "/social-facebook.png",
    },
    {
      href: publicConfig.social.tiktok,
      label: "TikTok",
      logo: "/social-tiktok.png",
    },
  ];

  return (
    <div
      className={`hidden md:flex fixed left-2 top-1/2 -translate-y-1/2 z-30 flex-col items-start transition-transform duration-300 ${
        collapsed ? "-translate-x-[calc(100%-14px)]" : ""
      }`}
    >
      <div className="flex flex-col gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={l.label}
            title={l.label}
            className="group flex items-center gap-2.5 rounded-lg p-1 transition-transform duration-200 hover:scale-105"
          >
            <Image
              src={l.logo}
              alt=""
              width={44}
              height={44}
              className="h-11 w-11 rounded-lg shadow-soft"
            />
            <span className="pointer-events-none max-w-0 overflow-hidden whitespace-nowrap rounded-md bg-card px-0 py-1.5 font-sans text-sm font-bold text-foreground opacity-0 shadow-lift transition-all duration-200 group-hover:max-w-[8rem] group-hover:px-3 group-hover:opacity-100">
              {l.label}
            </span>
          </a>
        ))}

        {publicConfig.social.instagram && (
          <a
            href={publicConfig.social.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            title="Instagram"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-white shadow-soft transition-transform duration-200 hover:scale-105"
            style={{
              backgroundImage:
                "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
            }}
          >
            <InstagramIcon size={24} />
          </a>
        )}
      </div>

      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Покажи социалните мрежи" : "Скрий социалните мрежи"}
        className="mt-2 ml-1 flex h-6 w-11 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-primary"
      >
        <ChevronRightIcon
          size={14}
          className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
