"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "./icons";

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Аудио плейър за preview или пълно слушане.
 *
 * Използва нативния <audio> елемент (стрийминг с Range заявки работи направо),
 * но с изцяло собствен интерфейс, за да пасне на темата.
 */
export function AudioPlayer({
  src,
  title,
  isPreview = false,
  className,
}: {
  src: string;
  title?: string;
  isPreview?: boolean;
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration);
    const onTime = () => setCurrent(audio.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setCurrent(0);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);
    const onError = () => {
      setError(true);
      setLoading(false);
      setPlaying(false);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("error", onError);
    };
  }, []);

  async function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      try {
        setLoading(true);
        await audio.play();
        setPlaying(true);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const value = Number(e.target.value);
    audio.currentTime = value;
    setCurrent(value);
  }

  function changeRate() {
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const next = rates[(rates.indexOf(rate) + 1) % rates.length]!;
    setRate(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className={`bg-card border border-border rounded-md p-4 ${className ?? ""}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      {(title || isPreview) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {title && (
            <p className="font-sans text-sm font-bold truncate">{title}</p>
          )}
          {isPreview && (
            <span className="shrink-0 text-[11px] font-sans font-bold uppercase tracking-wider text-primary">
              Откъс
            </span>
          )}
        </div>
      )}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          Аудиото не може да бъде заредено. Моля, опитайте отново по-късно.
        </p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            disabled={loading}
            aria-label={playing ? "Пауза" : "Пусни"}
            className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:brightness-95 transition-all disabled:opacity-60"
          >
            {loading ? (
              <span className="block h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : playing ? (
              <PauseIcon size={18} />
            ) : (
              <PlayIcon size={18} />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-primary rounded-full"
                style={{ width: `${progress}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={current}
                onChange={seek}
                aria-label="Позиция в записа"
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] font-mono text-muted-foreground tabular-nums">
              <span>{formatTime(current)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={changeRate}
            aria-label="Скорост на възпроизвеждане"
            title="Скорост на възпроизвеждане"
            className="shrink-0 h-8 px-2 font-mono text-xs rounded-md border border-border hover:bg-muted transition-colors tabular-nums"
          >
            {rate}×
          </button>
        </div>
      )}
    </div>
  );
}
