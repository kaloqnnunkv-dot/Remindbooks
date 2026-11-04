"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DAY_STORAGE_KEY,
  PHASES,
  nightAt,
  nowHour,
  phaseOf,
  skyAt,
  sunX,
  wrapHour,
  type Phase,
} from "@/lib/daylight";

/**
 * Часът от деня като общо състояние на сайта.
 *
 * По подразбиране следва истинския час на посетителя („Сега“). Щом той сам
 * избере час — с бутона в менюто или с плъзгача на началната страница — сайтът
 * спира да следва часовника, докато не натисне „Върни към сега“. Изборът се
 * пази за сесията, за да не се губи при преминаване между страници.
 *
 * Тук се рисува и небето зад страницата: градиентът и звездите.
 */

type DayContextValue = {
  hour: number;
  phase: Phase;
  /** true, докато сайтът следва истинския час. */
  live: boolean;
  /** false до първото изчертаване в браузъра — дотогава часът е условен. */
  ready: boolean;
  /** Мигновено задаване (влачене, клавиатура). Спира следването на часовника. */
  setHour: (h: number) => void;
  /** Плавно превъртане до даден час. */
  goTo: (h: number, live?: boolean) => void;
  /** Обратно към истинския час. */
  resume: () => void;
};

const DayContext = createContext<DayContextValue | null>(null);

export function useDay(): DayContextValue {
  const ctx = useContext(DayContext);
  if (!ctx) throw new Error("useDay трябва да се ползва вътре в <DaylightProvider>.");
  return ctx;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function readStored(): { hour: number; live: boolean } | null {
  try {
    const raw = sessionStorage.getItem(DAY_STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { hour?: unknown; live?: unknown };
    if (v.live === false && typeof v.hour === "number") return { hour: v.hour, live: false };
  } catch {
    /* частен режим или блокирано хранилище — просто следваме часовника */
  }
  return null;
}

function writeStored(hour: number, live: boolean) {
  try {
    if (live) sessionStorage.removeItem(DAY_STORAGE_KEY);
    else sessionStorage.setItem(DAY_STORAGE_KEY, JSON.stringify({ hour, live }));
  } catch {
    /* няма значение — изборът просто няма да оцелее при презареждане */
  }
}

/** Прилага часа върху документа: фаза, режим и променливите на небето. */
function paint(h: number) {
  const root = document.documentElement;
  const [top, mid, low] = skyAt(h);
  const p = phaseOf(h);
  root.style.setProperty("--sky-top", top);
  root.style.setProperty("--sky-mid", mid);
  root.style.setProperty("--sky-low", low);
  root.style.setProperty("--night", nightAt(h).toFixed(3));
  root.style.setProperty("--sx", sunX(h).toFixed(3));
  if (root.dataset.phase !== p) {
    root.dataset.phase = p;
    root.dataset.mode = PHASES[p].mode;
  }
}

export function DaylightProvider({ children }: { children: React.ReactNode }) {
  // На сървъра часът е непознат: започваме от пладне и веднага след
  // хидратацията минаваме към истинския. Палитрата вече е вярна от скрипта в
  // <head>, така че се сменят само цифрите на часовника.
  const [hour, setHourState] = useState(12);
  const [live, setLive] = useState(true);
  const [ready, setReady] = useState(false);
  const hourRef = useRef(12);
  const tween = useRef<number | null>(null);

  const commit = useCallback((h: number) => {
    const w = wrapHour(h);
    hourRef.current = w;
    setHourState(w);
    paint(w);
  }, []);

  const stopTween = () => {
    if (tween.current !== null) cancelAnimationFrame(tween.current);
    tween.current = null;
  };

  useEffect(() => {
    const stored = readStored();
    if (stored) {
      setLive(false);
      commit(stored.hour);
    } else {
      commit(nowHour());
    }
    setReady(true);
  }, [commit]);

  // Докато следваме часовника, го опресняваме на всеки 30 секунди.
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => {
      if (tween.current === null) commit(nowHour());
    }, 30_000);
    return () => window.clearInterval(id);
  }, [live, commit]);

  const setHour = useCallback(
    (h: number) => {
      stopTween();
      setLive(false);
      commit(h);
      writeStored(wrapHour(h), false);
    },
    [commit],
  );

  const goTo = useCallback(
    (target: number, toLive = false) => {
      stopTween();
      setLive(toLive);
      const h0 = hourRef.current;
      // Най-краткият път по кръга на денонощието.
      const d = ((((target - h0) % 24) + 36) % 24) - 12;
      const dur = reducedMotion() ? 0 : 900 + Math.abs(d) * 90;
      const t0 = performance.now();
      writeStored(wrapHour(target), toLive);

      const step = (now: number) => {
        const t = dur ? Math.min(1, (now - t0) / dur) : 1;
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        commit(h0 + d * e);
        tween.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      tween.current = requestAnimationFrame(step);
    },
    [commit],
  );

  const resume = useCallback(() => goTo(nowHour(), true), [goTo]);

  useEffect(() => stopTween, []);

  const value = useMemo<DayContextValue>(
    () => ({ hour, phase: phaseOf(hour), live, ready, setHour, goTo, resume }),
    [hour, live, ready, setHour, goTo, resume],
  );

  return (
    <DayContext.Provider value={value}>
      <div className="rb-sky" aria-hidden="true" />
      <StarField hour={hour} />
      {children}
    </DayContext.Provider>
  );
}

/** Звездите по целия екран — само щом страницата е потъмняла. */
function StarField({ hour }: { hour: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const api = useRef<{ set: (a: number) => void } | null>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduce = reducedMotion();
    let stars: { x: number; y: number; r: number; p: number }[] = [];
    let running = false;
    let raf = 0;

    const draw = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.fillStyle = "#f6e7c8";
      for (const s of stars) {
        ctx.globalAlpha = 0.25 + 0.45 * Math.abs(Math.sin(t / 1800 + s.p));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, 7);
        ctx.fill();
      }
    };
    const size = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      stars = Array.from({ length: 150 }, () => ({
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: Math.random() * 1.3 * dpr + 0.2,
        p: Math.random() * 6,
      }));
      draw(0);
    };
    const loop = (t: number) => {
      if (!running) return;
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    size();
    window.addEventListener("resize", size);
    api.current = {
      set(a: number) {
        c.style.opacity = String(a);
        const want = a > 0.02 && !reduce;
        if (want && !running) {
          running = true;
          raf = requestAnimationFrame(loop);
        } else if (!want) {
          running = false;
        }
      },
    };

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      api.current = null;
    };
  }, []);

  useEffect(() => {
    const p = phaseOf(hour);
    api.current?.set(PHASES[p].mode === "dark" ? nightAt(hour) : 0);
  }, [hour]);

  return <canvas ref={ref} className="rb-stars" aria-hidden="true" />;
}
