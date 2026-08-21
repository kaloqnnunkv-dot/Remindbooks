import Image from "next/image";
import Link from "next/link";
import { cn } from "./ui";

/**
 * Логото на Remind Books.
 *
 * Използва се официалният файл вместо пресъздаване с текст — така
 * пропорциите и формата на книгата остават точно както са зададени в
 * марката, независимо от наличните шрифтове.
 */
export function Logo({
  className,
  priority = false,
  width = 168,
  src = "/logo.webp",
}: {
  className?: string;
  priority?: boolean;
  width?: number;
  /** Подменено лого от админ панела. Празно означава вграденото. */
  src?: string;
}) {
  // Оригиналът е 430×176 — запазваме съотношението.
  const height = Math.round((width * 176) / 430);

  // Височината се задава от извикващия (напр. "h-9"). Тук нарочно няма
  // `h-auto` — две височинни класа си противоречат и Tailwind не гарантира
  // кой ще надделее, което води до различен размер на различни страници.
  return (
    <Image
      src={src}
      alt="Remind Books"
      width={width}
      height={height}
      priority={priority}
      className={cn("w-auto object-contain", className ?? "h-auto")}
    />
  );
}

/** Логото като връзка към началната страница — за навигацията и footer-а. */
export function LogoLink({
  className,
  width,
  priority,
  src,
}: {
  className?: string;
  width?: number;
  priority?: boolean;
  src?: string;
}) {
  return (
    <Link
      href="/"
      aria-label="Remind Books — начална страница"
      className={cn("inline-flex shrink-0 items-center", className)}
    >
      <Logo width={width} priority={priority} src={src} />
    </Link>
  );
}
