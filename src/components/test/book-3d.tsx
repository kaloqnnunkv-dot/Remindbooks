"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * Книга в CSS 3D — проба.
 *
 * Тялото е кутия от шест лица (`transform-style: preserve-3d`), а корицата е
 * седмо лице, което се върти около левия си ръб — там е тегелът.
 *
 * Всичко се управлява от един кадров цикъл: целите се задават от показалеца,
 * а показваните стойности ги догонват с постоянно затихване. Затова движението
 * никога не е рязко, независимо колко бързо мърда мишката.
 */

/** Размери в пиксели: ширина, височина, дебелина на книжното тяло. */
const W = 250;
const H = 375;
const D = 34;

export type BookTuning = {
  /** Максимален наклон след курсора, в градуси. */
  tilt: number;
  /** Скорост на влачене (px/кадър), при която корицата се отваря докрай. */
  openAt: number;
  /** Докъде се отваря корицата, в градуси. */
  maxOpen: number;
  /** Докъде се накланя книгата при теглене нагоре и надолу, в градуси. */
  pull: number;
  /** Колко бързо стойностите догонват целта (0–1). По-малко = по-плавно. */
  ease: number;
};

export const DEFAULT_TUNING: BookTuning = {
  tilt: 20,
  openAt: 26,
  maxOpen: 115,
  pull: 26,
  ease: 0.09,
};

/** Ръбът на листата — тънки светли и тъмни ивици. */
const PAGE_EDGE =
  "repeating-linear-gradient(to right, #f6f1e4 0 1px, #ded5c0 1px 2px)";
const PAGE_EDGE_V =
  "repeating-linear-gradient(to bottom, #f6f1e4 0 1px, #ded5c0 1px 2px)";

/** Колко се приближава книгата в режим „Разлисти“. */
const READ_Z = 380;

export function Book3D({
  cover,
  title,
  pages = [],
  tuning = DEFAULT_TUNING,
}: {
  cover: string | null;
  title: string;
  /** Снимки на първите страници. Липсващите се рисуват като празен лист. */
  pages?: (string | null)[];
  tuning?: BookTuning;
}) {
  // Един лист носи две страници — лице и гръб.
  const leaves: { front: string | null; back: string | null; nums: [number, number] }[] = [];
  for (let i = 0; i < pages.length; i += 2) {
    leaves.push({
      front: pages[i] ?? null,
      back: pages[i + 1] ?? null,
      nums: [i + 1, i + 2],
    });
  }
  // При нечетен брой последният гръб е празен — няма смисъл да се обръща.
  const maxTurn = pages.length % 2 === 0 ? leaves.length : leaves.length - 1;

  const [reading, setReading] = useState(false);
  const [turned, setTurned] = useState(0);

  const sceneRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const backCoverRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);

  // Настройките се четат вътре в кадровия цикъл, затова стоят в ref —
  // иначе цикълът щеше да се пресъздава при всяко плъзгане на регулатора.
  const tune = useRef(tuning);
  tune.current = tuning;

  const s = useRef({
    aimY: 0, // цел от позицията на курсора
    aimX: 0,
    curY: 0, // показвана стойност
    curX: 0,
    spin: 0, // добавка от влаченето настрани
    nudge: 0, // добавка от влаченето нагоре/надолу
    open: 0, // показвано отваряне, 0–1
    speed: 0, // скорост на влачене
    read: 0, // преход към режим „Разлисти“, 0–1
    reading: false,
    dragging: false,
    lastX: 0,
    lastY: 0,
  });

  s.current.reading = reading;

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const tick = () => {
      const v = s.current;
      const t = tune.current;

      // Преходът към разлистване е една стойност 0–1; всичко останало се
      // смесва по нея, за да няма два състезаващи се начина на движение.
      v.read += ((v.reading ? 1 : 0) - v.read) * t.ease * 0.9;

      // Скоростта затихва сама — оттам идва и затварянето на корицата.
      v.speed *= 0.9;
      if (Math.abs(v.speed) < 0.05) v.speed = 0;

      // След пускане книгата не се връща — доизплъзва се по инерция и остава
      // там, където е спряла. Затихващата скорост движи и завъртането, затова
      // спирането и затварянето на капаците свършват заедно.
      if (!v.dragging) v.spin += v.speed * 0.45;

      // Колкото по-бързо влачиш, толкова повече се отваря — но не над края.
      const want = Math.min(1, Math.abs(v.speed) / t.openAt);
      v.open += (want - v.open) * t.ease * 1.4;

      // В режим „Разлисти“ книгата се изправя срещу читателя; свободната игра
      // отстъпва плавно, вместо да бъде прекъсната.
      const free = 1 - v.read;
      v.curY += ((v.aimY + v.spin) * free - v.curY) * t.ease;
      v.curX += ((v.aimX + v.nudge) * free + v.read * -6 - v.curX) * t.ease;

      const book = bookRef.current;
      if (book) {
        // Тегелът е в левия ръб, затова разтвореният лист излиза наляво —
        // книгата се измества надясно с половин ширина, за да остане в центъра.
        book.style.transform =
          `translateX(${(v.read * (W / 2)).toFixed(1)}px) translateZ(${(v.read * READ_Z).toFixed(1)}px) ` +
          `rotateX(${v.curX.toFixed(2)}deg) rotateY(${v.curY.toFixed(2)}deg)`;
      }
      // Отварянето от влаченето отстъпва на пълния разтвор при разлистване.
      const angle = v.open * t.maxOpen * free + v.read * 178;
      const cov = coverRef.current;
      if (cov) {
        cov.style.transform = `translateZ(${D / 2}px) rotateY(${(-angle).toFixed(2)}deg)`;
      }
      // Задният капак се отваря със същия ъгъл, но на другата страна — така
      // книгата се разтваря симетрично, а не само отпред.
      const back = backCoverRef.current;
      if (back) {
        back.style.transform = `translateZ(${-D / 2}px) rotateY(${angle.toFixed(2)}deg)`;
      }
      const sh = shadowRef.current;
      if (sh) {
        // Сянката се разлива, докато корицата се отваря, и гасне при
        // разлистване — там книгата вече не стои на плот.
        sh.style.transform = `translateX(-50%) scaleX(${(1 + v.open * 0.75 + v.read * 0.6).toFixed(3)})`;
        sh.style.opacity = `${((0.28 - v.open * 0.1) * (1 - v.read)).toFixed(3)}`;
      }

      frame = requestAnimationFrame(tick);
    };

    if (!reduced) frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    const v = s.current;
    const t = tune.current;
    // В режим „Разлисти“ книгата стои мирно — иначе четенето става невъзможно.
    if (v.reading) return;

    if (v.dragging) {
      const dx = e.clientX - v.lastX;
      const dy = e.clientY - v.lastY;
      v.lastX = e.clientX;
      v.lastY = e.clientY;

      v.spin += dx * 0.45;
      // Обратен знак: теглене надолу изнася горния ръб напред, а долния назад.
      v.nudge = Math.max(-t.pull, Math.min(t.pull, v.nudge - dy * 0.16));
      // Плавна скорост, за да не подскача отварянето при трепване на ръката.
      v.speed = v.speed * 0.6 + dx * 0.4;
      return;
    }

    // Следването на курсора важи само когато книгата не е хваната — иначе
    // двете движения се борят и завъртането от ръката се размива.
    const box = sceneRef.current?.getBoundingClientRect();
    if (!box) return;

    // −1..1 спрямо центъра на сцената
    const nx = (e.clientX - box.left) / box.width - 0.5;
    const ny = (e.clientY - box.top) / box.height - 0.5;
    v.aimY = nx * t.tilt * 2;
    v.aimX = -ny * t.tilt;
  };

  const startDrag = (e: React.PointerEvent) => {
    const v = s.current;
    if (v.reading) return;
    v.dragging = true;
    v.lastX = e.clientX;
    v.lastY = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const endDrag = (e: React.PointerEvent) => {
    s.current.dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  const face: React.CSSProperties = { position: "absolute", backfaceVisibility: "hidden" };

  return (
    <div>
    <div
      ref={sceneRef}
      onPointerMove={onPointerMove}
      onPointerDown={startDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={() => {
        s.current.aimY = 0;
        s.current.aimX = 0;
      }}
      className={`relative flex h-[560px] w-full touch-none select-none items-center justify-center ${
        reading ? "cursor-default" : "cursor-grab active:cursor-grabbing"
      }`}
      style={{ perspective: "1800px" }}
    >
      {/* Сянка на пода — извън 3D слоя, за да не се върти с книгата */}
      <div
        ref={shadowRef}
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[70px] left-1/2 h-6 w-[260px] rounded-[50%] bg-black blur-xl"
      />

      <div
        ref={bookRef}
        style={{ width: W, height: H, transformStyle: "preserve-3d" }}
        className="relative"
      >
        {/* Заден капак — на същия тегел, отваря се в обратната посока */}
        <div
          ref={backCoverRef}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
            transform: `translateZ(${-D / 2}px)`,
          }}
        >
          {/* Външна страна */}
          <div
            style={{
              ...face,
              inset: 0,
              transform: "rotateY(180deg)",
              background: "linear-gradient(135deg, #4a3f34, #2f2823)",
              borderRadius: "6px 2px 2px 6px",
            }}
          />
          {/* Вътрешна страна */}
          <div
            style={{
              ...face,
              inset: 0,
              background: "linear-gradient(105deg, #e6dfcd, #f4eee0)",
              borderRadius: "2px 6px 6px 2px",
            }}
          />
        </div>

        {/* Тегел */}
        <div
          style={{
            ...face,
            width: D,
            height: H,
            left: `calc(50% - ${D / 2}px)`,
            transform: `rotateY(-90deg) translateZ(${W / 2}px)`,
            background: "linear-gradient(90deg, #241e1a, #4a3f34 45%, #241e1a)",
            borderRadius: 3,
          }}
        />

        {/* Ръбове на листата: отдясно, отгоре, отдолу */}
        <div
          style={{
            ...face,
            width: D,
            height: H,
            left: `calc(50% - ${D / 2}px)`,
            transform: `rotateY(90deg) translateZ(${W / 2}px)`,
            background: PAGE_EDGE,
          }}
        />
        <div
          style={{
            ...face,
            width: W,
            height: D,
            top: `calc(50% - ${D / 2}px)`,
            transform: `rotateX(90deg) translateZ(${H / 2}px)`,
            background: PAGE_EDGE_V,
          }}
        />
        <div
          style={{
            ...face,
            width: W,
            height: D,
            top: `calc(50% - ${D / 2}px)`,
            transform: `rotateX(-90deg) translateZ(${H / 2}px)`,
            background: PAGE_EDGE_V,
          }}
        />

        {/* Първата страница — вижда се, щом корицата се отвори */}
        <div
          style={{
            ...face,
            inset: "6px 6px 6px 10px",
            transform: `translateZ(${D / 2 - 3}px)`,
            background: "linear-gradient(105deg, #efe8d8, #fbf7ec 40%)",
            boxShadow: "inset 14px 0 22px -14px rgba(0,0,0,.45)",
          }}
        />

        {/* Последната страница — иначе отзад зее празно, щом капакът се отвори.
            Отстъпите и сянката са огледални, защото лицето е обърнато. */}
        <div
          style={{
            ...face,
            inset: "6px 10px 6px 6px",
            transform: `rotateY(180deg) translateZ(${D / 2 - 3}px)`,
            background: "linear-gradient(105deg, #efe8d8, #fbf7ec 40%)",
            boxShadow: "inset -14px 0 22px -14px rgba(0,0,0,.45)",
          }}
        />

        {/* Листата за разлистване.
            Всеки лист виси на същия тегел като корицата и се обръща на 178°.
            Отместването по Z е така, че лист 0 да е най-отгоре отдясно — и
            след обръщането същият ред да се запази отляво, само огледален. */}
        {reading &&
          leaves.map((leaf, k) => (
            <div
              key={k}
              style={{
                position: "absolute",
                inset: "6px 8px 6px 8px",
                transformOrigin: "left center",
                transformStyle: "preserve-3d",
                transform: `translateZ(${D / 2 - 2 - k * 0.5}px) rotateY(${k < turned ? -178 : 0}deg)`,
                transition: "transform 720ms cubic-bezier(.3,.75,.25,1)",
              }}
            >
              <PageFace src={leaf.front} number={leaf.nums[0]} style={face} />
              <PageFace
                src={leaf.back}
                number={leaf.nums[1]}
                mirrored
                style={{ ...face, transform: "rotateY(180deg)" }}
              />
            </div>
          ))}

        {/* Корицата: върти се около левия си ръб */}
        <div
          ref={coverRef}
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "left center",
            transformStyle: "preserve-3d",
            transform: `translateZ(${D / 2}px)`,
          }}
        >
          {/* Лице */}
          <div
            style={{
              ...face,
              inset: 0,
              overflow: "hidden",
              borderRadius: "2px 6px 6px 2px",
              background: "#3a322c",
              boxShadow: "inset 10px 0 18px -12px rgba(0,0,0,.7)",
            }}
          >
            {cover ? (
              <Image
                src={cover}
                alt={title}
                fill
                sizes="250px"
                className="object-cover"
                draggable={false}
              />
            ) : (
              <span className="flex h-full items-center justify-center px-6 text-center text-sm text-white/80">
                {title}
              </span>
            )}
            {/* Отблясък по дължината на корицата */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(105deg, rgba(255,255,255,.22), transparent 38%, transparent 72%, rgba(0,0,0,.22))",
              }}
            />
          </div>

          {/* Гръб на корицата — вътрешната ѝ страна */}
          <div
            style={{
              ...face,
              inset: 0,
              transform: "rotateY(180deg)",
              background: "linear-gradient(105deg, #e6dfcd, #f4eee0)",
              borderRadius: "6px 2px 2px 6px",
            }}
          />
        </div>
      </div>
    </div>

    {/* Управление */}
    <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
      {!reading ? (
        <button
          type="button"
          onClick={() => {
            setTurned(0);
            setReading(true);
          }}
          disabled={leaves.length === 0}
          className="rounded-md bg-primary px-6 py-2.5 font-sans text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          Разлисти
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setTurned((n) => Math.max(0, n - 1))}
            disabled={turned === 0}
            className="rounded-md border border-border px-4 py-2.5 font-sans text-sm font-bold disabled:opacity-40"
          >
            ‹ Назад
          </button>
          <span className="min-w-[9rem] text-center font-sans text-sm text-muted-foreground">
            Страница {Math.min(turned * 2 + 1, pages.length)} от {pages.length}
          </span>
          <button
            type="button"
            onClick={() => setTurned((n) => Math.min(maxTurn, n + 1))}
            disabled={turned >= maxTurn}
            className="rounded-md border border-border px-4 py-2.5 font-sans text-sm font-bold disabled:opacity-40"
          >
            Напред ›
          </button>
          <button
            type="button"
            onClick={() => setReading(false)}
            className="rounded-md px-4 py-2.5 font-sans text-sm font-bold text-muted-foreground hover:text-foreground"
          >
            Затвори
          </button>
        </>
      )}
    </div>
    </div>
  );
}

/**
 * Една страница — качена снимка или празен лист, ако още няма такава.
 *
 * Числото стои в ъгъла, за да е ясно коя страница се вижда, докато снимките
 * още ги няма.
 */
function PageFace({
  src,
  number,
  mirrored = false,
  style,
}: {
  src: string | null;
  number: number;
  mirrored?: boolean;
  style: React.CSSProperties;
}) {
  return (
    <div
      style={{
        ...style,
        inset: 0,
        overflow: "hidden",
        borderRadius: mirrored ? "4px 1px 1px 4px" : "1px 4px 4px 1px",
        background: "linear-gradient(105deg, #f3ecdc, #fdfaf1 45%)",
        // Сянка откъм тегела — там страницата хлътва към сгъвката.
        boxShadow: mirrored
          ? "inset -16px 0 24px -16px rgba(0,0,0,.4)"
          : "inset 16px 0 24px -16px rgba(0,0,0,.4)",
      }}
    >
      {src ? (
        <Image src={src} alt="" fill sizes="250px" className="object-cover" draggable={false} />
      ) : (
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            // Празен лист с намек за редове текст.
            background:
              "repeating-linear-gradient(to bottom, transparent 0 26px, rgba(52,44,37,.13) 26px 28px)",
            margin: "34px 22px",
          }}
        />
      )}
      <span
        className={`absolute bottom-2 font-sans text-[10px] text-muted-foreground ${
          mirrored ? "left-3" : "right-3"
        }`}
      >
        {number}
      </span>
    </div>
  );
}

/**
 * Книгата плюс регулатори.
 *
 * Регулаторите са само за пробата — за да може усещането да се нагласи на
 * място, вместо да се гадае по числа в кода.
 */
export function BookLab({
  cover,
  title,
  pages = [],
}: {
  cover: string | null;
  title: string;
  pages?: (string | null)[];
}) {
  const [t, setT] = useState<BookTuning>(DEFAULT_TUNING);

  const sliders: { key: keyof BookTuning; label: string; min: number; max: number; step: number }[] =
    [
      { key: "tilt", label: "Наклон след курсора", min: 0, max: 40, step: 1 },
      { key: "openAt", label: "Скорост за пълно отваряне", min: 6, max: 70, step: 1 },
      { key: "maxOpen", label: "Докъде се отваря", min: 20, max: 170, step: 5 },
      { key: "pull", label: "Теглене нагоре/надолу", min: 0, max: 60, step: 2 },
      { key: "ease", label: "Плавност", min: 0.02, max: 0.3, step: 0.01 },
    ];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[1fr_280px]">
      <Book3D cover={cover} title={title} pages={pages} tuning={t} />

      <div className="rounded-md border border-border bg-card p-5">
        <p className="font-sans text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Настройки на пробата
        </p>
        <div className="mt-4 space-y-4">
          {sliders.map((sl) => (
            <label key={sl.key} className="block">
              <span className="flex justify-between font-sans text-xs">
                <span>{sl.label}</span>
                <span className="text-muted-foreground">{t[sl.key]}</span>
              </span>
              <input
                type="range"
                min={sl.min}
                max={sl.max}
                step={sl.step}
                value={t[sl.key]}
                onChange={(e) =>
                  setT((prev) => ({ ...prev, [sl.key]: Number(e.target.value) }))
                }
                className="mt-1.5 w-full accent-[var(--primary)]"
              />
            </label>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setT(DEFAULT_TUNING)}
          className="mt-5 w-full rounded-md border border-border px-3 py-2 font-sans text-xs font-bold hover:bg-muted"
        >
          Върни изходните
        </button>
        <p className="mt-4 font-sans text-xs leading-relaxed text-muted-foreground">
          Кажете ми кои числа ви харесват и ги заковавам.
        </p>
      </div>
    </div>
  );
}

/**
 * Трите книги отгоре: при посочване се повдигат и изместват встрани.
 *
 * Тук няма кадров цикъл — един CSS преход върши работа и не струва нищо.
 */
export function BookRow({
  books,
}: {
  books: { id: string; title: string; cover: string | null }[];
}) {
  const [lifted, setLifted] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-end justify-center gap-10 sm:gap-16">
      {books.map((b, i) => {
        const on = lifted === b.id;
        return (
          <div
            key={b.id}
            onMouseEnter={() => setLifted(b.id)}
            onMouseLeave={() => setLifted(null)}
            className="relative"
            style={{ perspective: "1200px" }}
          >
            <div
              className="relative h-[300px] w-[200px] transition-transform duration-[520ms]"
              style={{
                transformStyle: "preserve-3d",
                transitionTimingFunction: "cubic-bezier(.2,.8,.2,1)",
                transform: on
                  ? `translate3d(${i % 2 ? -10 : 10}px, -18px, 40px) rotateY(${i % 2 ? 13 : -13}deg) rotateX(5deg)`
                  : "translate3d(0,0,0) rotateY(0deg) rotateX(0deg)",
              }}
            >
              {/* Тегел — дава дебелина при завъртането */}
              <div
                className="absolute left-0 top-0 h-full"
                style={{
                  width: 24,
                  transformOrigin: "left center",
                  transform: "rotateY(-90deg)",
                  background: "linear-gradient(90deg, #241e1a, #4a3f34 45%, #241e1a)",
                }}
              />
              <div className="absolute inset-0 overflow-hidden rounded-sm border border-border bg-card shadow-lift">
                {b.cover ? (
                  <Image
                    src={b.cover}
                    alt={b.title}
                    fill
                    sizes="200px"
                    className="object-cover"
                    draggable={false}
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-4 text-center text-sm">
                    {b.title}
                  </span>
                )}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="mx-auto mt-5 h-4 rounded-[50%] bg-black blur-lg transition-all duration-[520ms]"
              style={{ width: on ? 150 : 180, opacity: on ? 0.16 : 0.26 }}
            />
            <p className="mt-2 text-center font-sans text-sm text-muted-foreground">
              {b.title}
            </p>
          </div>
        );
      })}
    </div>
  );
}
