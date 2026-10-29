"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Clip } from "@/quests/types";

export type PlayerStatus = "idle" | "playing" | "paused" | "ended";

/** Пока длительность файла не известна — оцениваем по тексту (как в скрипте заглушек). */
const CHARS_PER_SECOND = 14;
export const estimate = (clip: Clip) =>
  Math.max(3, clip.paragraphs.join(" ").length / CHARS_PER_SECOND);

/**
 * Плеер кусков аудио: «Слушать» играет куски блока подряд, без нажатий между ними.
 * Один на всю станцию: так реплику после ответа можно запустить прямо в нажатии
 * на ответ — iPhone разрешает звук только после действия пользователя.
 */
export function useClipPlayer(baseUrl: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [durations, setDurations] = useState<Record<string, number>>({});

  // Копии для обработчиков событий аудио (обновляются в start и при переходе к куску).
  const clipsRef = useRef<Clip[]>([]);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  // Если звукового файла нет (или он не загрузился) — «играем» по примерному времени,
  // чтобы полоса прогресса и смена картинок работали так же, как с файлом.
  const sim = useRef<{ on: boolean; t: number; timer: ReturnType<typeof setInterval> | null }>({
    on: false,
    t: 0,
    timer: null,
  });

  // Экран не гаснет, пока идёт аудио (ТЗ станций, «Работа на улице»).
  const keepAwake = useCallback(async (on: boolean) => {
    try {
      if (on && !wakeLock.current && "wakeLock" in navigator) {
        wakeLock.current = await navigator.wakeLock.request("screen");
      } else if (!on && wakeLock.current) {
        await wakeLock.current.release();
        wakeLock.current = null;
      }
    } catch {
      // Не во всех браузерах есть — квест работает и без этого.
    }
  }, []);

  const stopSim = useCallback(() => {
    if (sim.current.timer) clearInterval(sim.current.timer);
    sim.current.timer = null;
  }, []);

  // Переход к следующему куску блока или конец блока (общий для файла и «без файла»).
  const advanceRef = useRef<() => void>(() => {});

  const runSim = useCallback(() => {
    stopSim();
    sim.current.on = true;
    sim.current.timer = setInterval(() => {
      const clip = clipsRef.current[indexRef.current];
      if (!clip) return;
      sim.current.t += 0.25;
      setTime(sim.current.t);
      if (sim.current.t >= estimate(clip)) advanceRef.current();
    }, 250);
  }, [stopSim]);

  const audio = useCallback(() => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "auto";
      el.addEventListener("timeupdate", () => {
        if (!sim.current.on) setTime(el.currentTime);
      });
      el.addEventListener("error", () => {
        // Файла нет — продолжаем по примерному времени, если сейчас должно играть.
        sim.current.t = 0;
        sim.current.on = true;
        if (playingRef.current) runSim();
      });
      el.addEventListener("loadedmetadata", () => {
        const clip = clipsRef.current[indexRef.current];
        if (clip && Number.isFinite(el.duration)) {
          setDurations((d) => ({ ...d, [clip.id]: el.duration }));
        }
      });
      el.addEventListener("ended", () => advanceRef.current());
      audioRef.current = el;
    }
    return audioRef.current;
  }, [runSim]);

  const load = useCallback(
    (el: HTMLAudioElement, clip: Clip, autoplay: boolean) => {
      stopSim();
      sim.current = { on: false, t: 0, timer: null };
      el.src = baseUrl + clip.file;
      if (autoplay) el.play().catch(() => undefined);
    },
    [baseUrl, stopSim],
  );

  useEffect(() => {
    advanceRef.current = () => {
      const el = audio();
      const next = indexRef.current + 1;
      if (next < clipsRef.current.length) {
        indexRef.current = next;
        setIndex(next);
        setTime(0);
        load(el, clipsRef.current[next], true);
      } else {
        stopSim();
        playingRef.current = false;
        setStatus("ended");
        void keepAwake(false);
      }
    };
  }, [audio, load, stopSim, keepAwake]);

  // Длительности всех кусков заранее — для общей полосы прогресса.
  useEffect(() => {
    clips.forEach((clip) => {
      const probe = new Audio();
      probe.preload = "metadata";
      probe.addEventListener("loadedmetadata", () => {
        if (Number.isFinite(probe.duration)) {
          setDurations((d) => ({ ...d, [clip.id]: probe.duration }));
        }
      });
      probe.src = baseUrl + clip.file;
    });
  }, [clips, baseUrl]);

  useEffect(
    () => () => {
      audioRef.current?.pause();
      stopSim();
      void keepAwake(false);
    },
    [keepAwake, stopSim],
  );

  /** Загрузить блок кусков и (по желанию) сразу запустить. Вызывать в обработчике нажатия. */
  const start = useCallback(
    (next: Clip[], autoplay = true) => {
      const el = audio();
      el.pause();
      clipsRef.current = next;
      indexRef.current = 0;
      setClips(next);
      setIndex(0);
      setTime(0);
      playingRef.current = autoplay;
      load(el, next[0], autoplay);
      if (autoplay) {
        setStatus("playing");
        void keepAwake(true);
      } else {
        setStatus("idle");
      }
    },
    [audio, load, keepAwake],
  );

  const play = useCallback(() => {
    const el = audio();
    if (status === "ended") {
      start(clipsRef.current);
      return;
    }
    setStatus("playing");
    playingRef.current = true;
    if (sim.current.on) runSim();
    else el.play().catch(() => undefined);
    void keepAwake(true);
  }, [audio, status, start, runSim, keepAwake]);

  const pause = useCallback(() => {
    audio().pause();
    stopSim();
    playingRef.current = false;
    setStatus("paused");
    void keepAwake(false);
  }, [audio, stopSim, keepAwake]);

  const back10 = useCallback(() => {
    if (sim.current.on) {
      sim.current.t = Math.max(0, sim.current.t - 10);
      setTime(sim.current.t);
      return;
    }
    const el = audio();
    el.currentTime = Math.max(0, el.currentTime - 10);
    setTime(el.currentTime);
  }, [audio]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    stopSim();
    playingRef.current = false;
    setStatus("idle");
    setClips([]);
    void keepAwake(false);
  }, [stopSim, keepAwake]);

  const lengthOf = (clip: Clip) => durations[clip.id] ?? estimate(clip);
  const total = clips.reduce((sum, c) => sum + lengthOf(c), 0);
  const elapsed =
    status === "ended"
      ? total
      : clips.slice(0, index).reduce((sum, c) => sum + lengthOf(c), 0) + time;

  return {
    clips,
    clip: clips[index] as Clip | undefined,
    clipTime: time,
    clipDuration: clips[index] ? lengthOf(clips[index]) : 0,
    status,
    elapsed,
    total,
    start,
    play,
    pause,
    back10,
    stop,
  };
}

export type ClipPlayer = ReturnType<typeof useClipPlayer>;

/** Какая картинка на экране в момент time внутри куска (по меткам времени или по тексту). */
export function visualAt(clip: Clip, time: number, duration: number, fallback: string) {
  const visuals = clip.visuals ?? [];
  if (visuals.length === 0) return clip.image ?? fallback;
  const text = clip.paragraphs.join("\n\n");
  let current = visuals[0].image;
  for (const v of visuals) {
    const at =
      v.at ?? (v.atText ? (Math.max(0, text.indexOf(v.atText)) / text.length) * duration : 0);
    if (time >= at) current = v.image;
  }
  return current;
}

export function formatTime(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
