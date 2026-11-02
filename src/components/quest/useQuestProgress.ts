"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Part } from "@/quests/types";
import { clearProgress, initialProgress, readProgress, writeProgress, type QuestProgress } from "@/lib/questProgress";

/** Только события игрока записывают данные; открытие страницы ничего не затирает. */
export function useQuestProgress(parts: Part[], startPart: number, storageKey: string) {
  const [progress, setProgress] = useState<QuestProgress | null>(null);
  const current = useRef<QuestProgress | null>(null);

  useEffect(() => {
    const restored = readProgress(storageKey, parts) ?? initialProgress(parts, startPart);
    current.current = restored;
    // Читаем браузерное хранилище только после серверного рендера. До этого
    // нет активного пустого экрана, который мог бы затереть сохранение.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(restored);
    return () => { current.current = null; };
  }, [parts, startPart, storageKey]);

  const update = useCallback((change: (previous: QuestProgress) => QuestProgress) => {
    if (!current.current) return;
    const next = change(current.current);
    current.current = next;
    // Пишем прямо в событии: закрытие браузера не должно обгонять запись.
    writeProgress(storageKey, parts, next);
    setProgress(next);
  }, [parts, storageKey]);

  // Вызывается только после подтверждения в QuestRunner.
  const reset = useCallback(() => {
    const next = initialProgress(parts, startPart);
    // Если браузер разрешает запись, но не удаление, пустое прохождение тоже
    // заменит старое. Другие записи браузера никогда не затрагиваем.
    if (!clearProgress(storageKey)) writeProgress(storageKey, parts, next);
    current.current = next;
    setProgress(next);
  }, [parts, startPart, storageKey]);

  return { progress, update, reset };
}
