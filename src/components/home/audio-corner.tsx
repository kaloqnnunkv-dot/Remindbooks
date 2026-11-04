"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDay } from "@/components/daylight";
import { PHASES, type BreathStep } from "@/lib/daylight";
import { formatDuration } from "@/lib/format";
import { useHome } from "./home-context";
import { Cover, Tags, priceLabel, type HomeItem } from "./shared";

const fmt = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  s = Math.floor(s);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const x = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`;
};

/** Височините на стълбчетата във вълната — декоративни, но винаги еднакви. */
const BARS = Array.from({ length: 90 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.31)));

/**
 * Аудио секцията: плейър със записите от каталога и „Минута тишина“.
 *
 * Пуска се истински звук: безплатните записи изцяло, платените — откъса им,
 * ако има качен. Когато нищо не свири, плейърът сам избира запис според часа
 * от деня.
 */
export function AudioCorner({ tracks }: { tracks: HomeItem[] }) {
  const { phase } = useDay();
  const { recs } = useHome();
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cur, setCur] = useState(0);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const track = tracks[cur];

  // Записът, подходящ за тази част от деня — освен ако нещо вече свири.
  useEffect(() => {
    if (playing || tracks.length === 0) return;
    const cue = recs[phase].find((r) => r.type === "AUDIO");
    const free = tracks.findIndex((t) => t.isFree);
    const want = cue ? tracks.findIndex((t) => t.id === cue.id) : phase === "morn" ? free : -1;
    if (want >= 0 && want !== cur) select(want, false);
    // Изборът зависи само от фазата; `playing` и `cur` не бива да го задействат.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = h * dpr;
    const x = c.getContext("2d");
    if (!x) return;
    x.scale(dpr, dpr);
    const cs = getComputedStyle(document.documentElement);
    const on = cs.getPropertyValue("--rb-accent").trim() || "#0d7a67";
    const dark = document.documentElement.dataset.mode === "dark";
    const off = dark ? "rgba(255,255,255,.18)" : "rgba(30,30,60,.14)";
    const total = dur || track?.durationSeconds || 1;
    const p = pos / total;
    const n = BARS.length;
    const bw = w / n;
    BARS.forEach((v, i) => {
      const bh = v * h * 0.9;
      x.fillStyle = i / n < p ? on : off;
      x.beginPath();
      if (x.roundRect) x.roundRect(i * bw + 1, (h - bh) / 2, Math.max(1, bw - 3), bh, 2);
      else x.rect(i * bw + 1, (h - bh) / 2, Math.max(1, bw - 3), bh);
      x.fill();
    });
  }, [pos, dur, track]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Цветовете преливат за секунда при смяна на фазата — прерисуваме след това.
  useEffect(() => {
    const id = window.setTimeout(draw, 1100);
    window.addEventListener("resize", draw);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", draw);
    };
  }, [phase, draw]);

  function select(i: number, autoplay: boolean) {
    const a = audioRef.current;
    setCur(i);
    setPos(0);
    setDur(0);
    setFailed(false);
    if (a) {
      a.pause();
      const src = tracks[i]?.audioSrc;
      if (src) {
        a.src = src;
        a.load();
        if (autoplay) void play(src);
      } else {
        a.removeAttribute("src");
        setPlaying(false);
      }
    }
  }

  /** `src` идва изрично при смяна на запис — `track` тогава е още старият. */
  async function play(src: string | null | undefined = track?.audioSrc) {
    const a = audioRef.current;
    if (!a || !src) return;
    if (!a.getAttribute("src")) {
      a.src = src;
      a.load();
    }
    try {
      await a.play();
    } catch {
      setFailed(true);
      setPlaying(false);
    }
  }

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else void play();
  };

  const seekTo = (s: number) => {
    const a = audioRef.current;
    const total = dur || 0;
    if (!a || !total) return;
    a.currentTime = Math.max(0, Math.min(total, s));
    setPos(a.currentTime);
  };

  if (!track) return null;

  const canPlay = Boolean(track.audioSrc) && !failed;
  const note = !track.audioSrc
    ? "Откъсът още не е качен"
    : failed
      ? "Записът не можа да се зареди"
      : track.isFree
        ? "Целият запис, безплатно"
        : "Безплатен откъс";

  return (
    <>
      <div className="rb-label">За слушане</div>
      <h2 className="rb-sec">Аудио медитации и четения</h2>
      <p className="rb-lead">
        Записи, които можете да слушате навсякъде — сутрешни практики, водени медитации и авторски
        четения. Част от съдържанието е напълно безплатно.
      </p>
      <div className="audio">
        <div className="player glass">
          <div className="p-top">
            <div className="p-art">
              <Cover item={track} sizes="96px" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="p-for">Подходящо за: {PHASES[phase].name.toLowerCase()}</div>
              <div className="p-title">
                <Link href={track.href}>{track.title}</Link>
              </div>
              <Tags item={track} />
            </div>
          </div>
          <canvas
            ref={canvasRef}
            className="wave"
            role="slider"
            tabIndex={canPlay ? 0 : -1}
            aria-label="Прогрес на записа"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(pos)}
            aria-valuetext={`${fmt(pos)} от ${fmt(dur)}`}
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              seekTo(((e.clientX - r.left) / r.width) * dur);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") seekTo(pos + 5);
              if (e.key === "ArrowLeft") seekTo(pos - 5);
            }}
          />
          <div className="p-time">
            <span>{fmt(pos)}</span>
            <span>{dur ? fmt(dur) : track.durationSeconds ? formatDuration(track.durationSeconds) : "—"}</span>
          </div>
          <div className="p-ctl">
            <button type="button" className="skip" aria-label="Назад 15 секунди" disabled={!canPlay} onClick={() => seekTo(pos - 15)}>
              −15
            </button>
            <button type="button" className="play" aria-label={playing ? "Пауза" : "Пусни"} disabled={!canPlay} onClick={toggle}>
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                {playing ? <path d="M6 4h4v16H6zM14 4h4v16h-4z" /> : <path d="M7 4l13 8-13 8z" />}
              </svg>
            </button>
            <button type="button" className="skip" aria-label="Напред 15 секунди" disabled={!canPlay} onClick={() => seekTo(pos + 15)}>
              +15
            </button>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{priceLabel(track)}</div>
              <div className="p-note">{note}</div>
            </div>
          </div>
          <audio
            ref={audioRef}
            preload="none"
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
            onTimeUpdate={(e) => setPos(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setPos(0);
            }}
            onError={() => {
              if (audioRef.current?.getAttribute("src")) {
                setFailed(true);
                setPlaying(false);
              }
            }}
          />
        </div>

        <div className="side-col">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tracks.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className={`track${i === cur ? " on" : ""}${i === cur && playing ? " playing" : ""}`}
                onClick={() => (i === cur ? toggle() : select(i, true))}
              >
                <div className="eq" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div>
                  <b>{b.title}</b>
                  <small>
                    {[b.author, b.durationSeconds ? formatDuration(b.durationSeconds) : null].filter(Boolean).join(", ")}
                  </small>
                </div>
                <div className="tp">{priceLabel(b)}</div>
              </button>
            ))}
          </div>
          <Breathe steps={PHASES[phase].breath.steps} name={PHASES[phase].breath.name} note={PHASES[phase].breath.note} />
        </div>
      </div>
    </>
  );
}

const WORD = { in: "Вдишайте", hold: "Задръжте", out: "Издишайте" } as const;

/** „Минута тишина“ — дишане с ритъм според часа от деня. */
function Breathe({ steps, name, note }: { steps: BreathStep[]; name: string; note: string }) {
  const [on, setOn] = useState(false);
  const [word, setWord] = useState<string>("Готови?");
  const [inhale, setInhale] = useState(false);
  const [secs, setSecs] = useState(4);

  useEffect(() => {
    if (!on) {
      setInhale(false);
      setWord("Готови?");
      return;
    }
    let k = 0;
    let timer = 0;
    const step = () => {
      const [kind, s] = steps[k % steps.length]!;
      k++;
      setSecs(s);
      if (kind === "in") setInhale(true);
      if (kind === "out") setInhale(false);
      setWord(WORD[kind]);
      timer = window.setTimeout(step, s * 1000);
    };
    step();
    return () => window.clearTimeout(timer);
  }, [on, steps]);

  return (
    <div className="breathe glass">
      <div className={`bring${inhale ? " in" : ""}`} aria-live="polite">
        <div className="c1" style={{ transitionDuration: `${secs}s` }} />
        <div className="c2" style={{ transitionDuration: `${secs}s` }} />
        <span>{word}</span>
      </div>
      <div>
        <div className="rb-label">Минута тишина</div>
        <h3>{name}</h3>
        <p>{note}</p>
        <button type="button" className="btn main" onClick={() => setOn((v) => !v)}>
          {on ? "Спри" : "Започни"}
        </button>
      </div>
    </div>
  );
}
