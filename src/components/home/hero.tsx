"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDay } from "@/components/daylight";
import {
  PHASES,
  clamp,
  curveY,
  elev,
  hhmm,
  lum,
  mix,
  nowHour,
  skyAt,
} from "@/lib/daylight";
import { formatDuration } from "@/lib/format";
import { useHome, type ShelfFilter } from "./home-context";
import { Cover, TYPE_LABEL, priceLabel } from "./shared";

/** useLayoutEffect без предупреждение при изчертаване на сървъра. */
const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Повторяеми „случайни“ числа — звездите излизат еднакво на сървъра и в браузъра. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const HERO_STARS = (() => {
  const r = seeded(42);
  return Array.from({ length: 70 }, () => ({
    left: r() * 100,
    top: r() * 70,
    delay: -r() * 3,
    opacity: 0.4 + r() * 0.6,
    scale: 0.6 + r() * 0.9,
  }));
})();

/** Кривата на пътя на слънцето, изчислена веднъж. */
const CURVE = (() => {
  let d = "";
  for (let i = 0; i <= 96; i++) {
    const h = i / 4;
    d += `${i ? "L" : "M"}${((h / 24) * 1000).toFixed(1)} ${curveY(h).toFixed(2)}`;
  }
  return d;
})();

/** Деленията по циферблата на компаса. */
const TICKS = (() => {
  const out: { x1: string; y1: string; x2: string; y2: string; card: boolean }[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const card = i % 18 === 0;
    const l = card ? 14 : i % 6 === 0 ? 9 : 5;
    out.push({
      x1: (100 + 92 * Math.sin(a)).toFixed(2),
      y1: (100 - 92 * Math.cos(a)).toFixed(2),
      x2: (100 + (92 - l) * Math.sin(a)).toFixed(2),
      y2: (100 - (92 - l) * Math.cos(a)).toFixed(2),
      card,
    });
  }
  return out;
})();

const MARKS = [
  { h: 0, label: "Полунощ", edge: "edge-l", left: 0 },
  { h: 6, label: "Изгрев", time: "06:00", left: 25 },
  { h: 12, label: "Пладне", time: "12:00", left: 50 },
  { h: 18, label: "Залез", time: "18:00", left: 75 },
  { h: 23.99, label: "24:00", edge: "edge-r", left: 100 },
] as const;

const CARDINALS: { dir: ShelfFilter | "blog"; ang: number; label: string; cls: string }[] = [
  { dir: "PHYSICAL", ang: 0, label: "Хартиени книги", cls: "c-n" },
  { dir: "PDF", ang: 90, label: "PDF книги", cls: "c-e" },
  { dir: "AUDIO", ang: 180, label: "Аудио", cls: "c-s" },
  { dir: "blog", ang: 270, label: "Блог", cls: "c-w" },
];

export function HomeHero() {
  const { hour, phase, live, ready, setHour, goTo, resume } = useDay();
  const { recs, openBook, setFilter } = useHome();
  const P = PHASES[phase];

  const heroRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const sunRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const [skyTop, skyMid] = skyAt(hour);
  const sky = lum(skyMid) * 0.6 + lum(skyTop) * 0.4 < 0.3 ? "dark" : "light";
  const e = elev(hour);
  const f = hour / 24;

  // Голямото слънце върви в една линия с плъзгача; луната е от другата страна на небето.
  const placeOrbs = useCallback(() => {
    const hero = heroRef.current;
    const track = trackRef.current;
    if (!hero || !track) return;
    const hr = hero.getBoundingClientRect();
    const tr = track.getBoundingClientRect();
    if (!hr.width) return;
    const xAt = (fr: number) => ((tr.left - hr.left + fr * tr.width) / hr.width) * 100;
    const place = (el: HTMLDivElement | null, x: number, el2: number) => {
      if (!el) return;
      if (el2 < -0.15) {
        el.style.opacity = "0";
        return;
      }
      el.style.opacity = "1";
      el.style.left = `${x}%`;
      el.style.top = `${84 - el2 * 50}%`;
    };
    place(sunRef.current, xAt(f), e);
    sunRef.current?.style.setProperty("--sun-c", mix("#ff7a3d", "#ffe9a0", clamp(e * 1.6, 0, 1)));
    place(moonRef.current, xAt(((hour + 12) % 24) / 24), -e);
  }, [e, f, hour]);

  useIsoLayoutEffect(() => {
    placeOrbs();
  }, [placeOrbs]);

  useEffect(() => {
    window.addEventListener("resize", placeOrbs);
    // След зареждането на шрифтовете оформлението се мести — слънцето също.
    document.fonts?.ready.then(placeOrbs).catch(() => {});
    return () => window.removeEventListener("resize", placeOrbs);
  }, [placeOrbs]);

  const hourFromX = (x: number) => {
    const r = trackRef.current!.getBoundingClientRect();
    return Math.round(clamp((x - r.left) / r.width, 0, 0.9999) * 24 * 12) / 12;
  };

  const onPointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if ((ev.target as HTMLElement).closest(".db-mark")) return;
    setDragging(true);
    ev.currentTarget.setPointerCapture(ev.pointerId);
    setHour(hourFromX(ev.clientX));
    knobRef.current?.focus({ preventScroll: true });
  };
  const onPointerMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (dragging) setHour(hourFromX(ev.clientX));
  };
  const endDrag = () => setDragging(false);

  const onKnobKey = (ev: React.KeyboardEvent) => {
    const steps: Record<string, number> = {
      ArrowRight: 0.25,
      ArrowUp: 0.25,
      ArrowLeft: -0.25,
      ArrowDown: -0.25,
      PageUp: 1,
      PageDown: -1,
    };
    const k = steps[ev.key];
    if (k !== undefined) {
      ev.preventDefault();
      setHour(hour + k);
    } else if (ev.key === "Home") {
      ev.preventDefault();
      goTo(nowHour(), true);
    }
  };

  const t = hhmm(hour);
  const isMarkOn = (h: number) => Math.abs(((((hour - h) % 24) + 36) % 24) - 12) < 0.05;

  return (
    <header className="hero" id="hero" ref={heroRef} data-sky={sky}>
      <div className="hstars" aria-hidden="true">
        {HERO_STARS.map((s, i) => (
          <i
            key={i}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              animationDelay: `${s.delay}s`,
              opacity: s.opacity,
              transform: `scale(${s.scale})`,
            }}
          />
        ))}
      </div>
      <div className="orb-sun" ref={sunRef} aria-hidden="true" />
      <div className="orb-moon" ref={moonRef} aria-hidden="true" />
      <div className="hill" aria-hidden="true" />
      <div className="hill b" aria-hidden="true" />

      <div className="daybar">
        <div className="db-read">
          <small>Час от деня</small>
          <time suppressHydrationWarning>{ready ? t : "--:--"}</time>
          <b>{ready ? P.name : " "}</b>
        </div>
        <div
          className={`db-track${dragging ? " drag" : ""}`}
          ref={trackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <clipPath id="rb-cUp">
                <rect x="0" y="-20" width="1000" height="70" />
              </clipPath>
              <clipPath id="rb-cDn">
                <rect x="0" y="50" width="1000" height="70" />
              </clipPath>
              <clipPath id="rb-cDone">
                <rect x="0" y="-20" width={(f * 1000).toFixed(1)} height="140" />
              </clipPath>
              <linearGradient id="rb-gUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffd36b" stopOpacity=".55" />
                <stop offset="1" stopColor="#ffd36b" stopOpacity=".05" />
              </linearGradient>
              <linearGradient id="rb-gDn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#6f6bd9" stopOpacity=".05" />
                <stop offset="1" stopColor="#6f6bd9" stopOpacity=".4" />
              </linearGradient>
            </defs>
            <path d={`${CURVE} L1000 50 L0 50Z`} fill="url(#rb-gUp)" clipPath="url(#rb-cUp)" />
            <path d={`${CURVE} L1000 50 L0 50Z`} fill="url(#rb-gDn)" clipPath="url(#rb-cDn)" />
            <line className="hz" x1="0" y1="50" x2="1000" y2="50" vectorEffect="non-scaling-stroke" />
            <path d={CURVE} className="crv" vectorEffect="non-scaling-stroke" />
            <path d={CURVE} className="done" clipPath="url(#rb-cDone)" vectorEffect="non-scaling-stroke" />
          </svg>
          <div
            ref={knobRef}
            className={`db-knob ${e > -0.02 ? "sun" : "moon"}`}
            style={{ left: `${f * 100}%`, top: `${(curveY(hour) / 100) * 68}px` }}
            role="slider"
            tabIndex={0}
            aria-label="Час от деня: светлина на сайта"
            aria-valuemin={0}
            aria-valuemax={1439}
            aria-valuenow={Math.round(hour * 60) % 1440}
            aria-valuetext={`${t}, ${P.name.toLowerCase()}`}
            onKeyDown={onKnobKey}
          />
          <div className="db-marks">
            {MARKS.map((m) => (
              <button
                key={m.h}
                type="button"
                className={`db-mark${"edge" in m ? ` ${m.edge}` : ""}${isMarkOn(m.h) ? " on" : ""}`}
                style={{ left: `${m.left}%` }}
                onClick={() => goTo(m.h, false)}
              >
                {m.label}
                {"time" in m && <em>{m.time}</em>}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="now" aria-pressed={live} onClick={() => !live && resume()}>
          {live ? "Сега" : "Върни към сега"}
        </button>
      </div>

      <div className="hero-in">
        <div className="hero-l">
          <div className="greet">{ready ? P.greet : " "}</div>
          <h1>
            Книги, които връщат <em>посоката</em>
          </h1>
          <p className="lede">
            Истории и практики за вътрешния компас. За сутринта, за деня и за тихите минути преди сън.
          </p>
          <div className="cta">
            <a className="btn main" href="#shelf">
              Разгледай книгите
            </a>
            <a className="btn ghost" href="#audio">
              Слушай безплатно
            </a>
          </div>
          {recs[phase].length > 0 && (
            <div className="recbox">
              <h3>
                <span>{P.head}</span>
                <small>{P.sub}</small>
              </h3>
              <div className="recs" key={phase}>
                {recs[phase].map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    className="rec"
                    style={{ animationDelay: `${i * 80}ms` }}
                    onClick={() => openBook(b)}
                  >
                    <span className="mini">
                      <Cover item={b} sizes="44px" />
                    </span>
                    <span>
                      <b>{b.title}</b>
                      <small>
                        {TYPE_LABEL[b.type]}
                        {b.durationSeconds ? `, ${formatDuration(b.durationSeconds)}` : ""}
                      </small>
                    </span>
                    <span className="pr">{priceLabel(b)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <Compass onPick={(dir) => {
          if (dir === "blog") {
            document.getElementById("blog")?.scrollIntoView({ behavior: smooth() });
            return;
          }
          setFilter(dir);
          document.getElementById("shelf")?.scrollIntoView({ behavior: smooth() });
        }} />
      </div>
    </header>
  );
}

const smooth = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/**
 * Компасът — пътеводител из каталога. Стрелката следва мишката, а при избор
 * на посока сочи натам и води до съответния рафт (или до блога).
 */
function Compass({ onPick }: { onPick: (dir: ShelfFilter | "blog") => void }) {
  const zoneRef = useRef<HTMLDivElement>(null);
  const needleRef = useRef<HTMLDivElement>(null);
  const angle = useRef(30);
  const locked = useRef(false);
  const [on, setOn] = useState<string | null>(null);
  const reduce = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const setNeedle = (a: number) => {
    const d = ((((a - angle.current) % 360) + 540) % 360) - 180;
    angle.current += d;
    if (needleRef.current) needleRef.current.style.transform = `rotate(${angle.current}deg)`;
  };

  return (
    <div className="compass-col">
      <div
        className="compass-zone"
        ref={zoneRef}
        onPointerMove={(ev) => {
          if (locked.current || reduce || !zoneRef.current) return;
          const r = zoneRef.current.getBoundingClientRect();
          setNeedle(
            (Math.atan2(ev.clientX - (r.left + r.width / 2), -(ev.clientY - (r.top + r.height / 2))) * 180) / Math.PI,
          );
        }}
        onPointerLeave={() => {
          locked.current = false;
        }}
      >
        <div className="dial">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle cx="100" cy="100" r="92" fill="none" stroke="var(--rb-brass)" strokeOpacity=".55" />
            <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeOpacity=".12" />
            {TICKS.map((tk, i) => (
              <line
                key={i}
                x1={tk.x1}
                y1={tk.y1}
                x2={tk.x2}
                y2={tk.y2}
                stroke="var(--rb-brass)"
                strokeOpacity={tk.card ? 1 : 0.5}
                strokeWidth={tk.card ? 1.6 : 0.8}
              />
            ))}
            <path
              d="M100 38 L106 100 L100 162 L94 100Z M38 100 L100 94 L162 100 L100 106Z"
              fill="currentColor"
              fillOpacity=".04"
              stroke="currentColor"
              strokeOpacity=".1"
            />
          </svg>
        </div>
        <div className="needle" ref={needleRef} style={{ transform: "rotate(30deg)" }} aria-hidden="true">
          <svg viewBox="0 0 20 80">
            <path className="t1" d="M10 0 L16 40 L10 44 L4 40Z" />
            <path className="t2" d="M10 0 L10 44 L4 40Z" />
            <path className="t3" d="M10 80 L16 40 L10 36 L4 40Z" />
            <path className="t4" d="M10 80 L10 36 L16 40Z" />
          </svg>
        </div>
        <div className="hub" aria-hidden="true" />
        {CARDINALS.map((c) => (
          <button
            key={c.dir}
            type="button"
            className={`cardinal ${c.cls}${on === c.dir ? " on" : ""}`}
            onClick={() => {
              locked.current = true;
              setNeedle(c.ang);
              setOn(c.dir);
              window.setTimeout(() => onPick(c.dir), reduce ? 0 : 650);
            }}
          >
            <span>{c.label}</span>
          </button>
        ))}
      </div>
      <p className="hint">Изберете посока, а компасът ще ви отведе дотам.</p>
    </div>
  );
}
