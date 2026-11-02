import type { Part, Step } from "../quests/types";

export type Screen =
  | { kind: "step"; p: number; i: number }
  | { kind: "hint"; p: number; i: number; n: number }
  | { kind: "found"; p: number; i: number }
  | { kind: "end" };

export type TaskState = {
  hints: number;
  wrong: number[];
  shake: number | null;
  shakes: number;
  solved: number | null;
  input: string;
};

export type QuestProgress = {
  history: Screen[];
  visitedAudio: string[];
  tasks: Record<string, TaskState>;
  pages: number[];
  crew: string[];
  firstMap: string | null;
};

export const freshTask: TaskState = {
  hints: 0, wrong: [], shake: null, shakes: 0, solved: null, input: "",
};

export function mapAt(parts: Part[], p: number, i: number): string | null {
  const step = parts[p]?.steps[i];
  return step?.type === "walk" && step.point ? `${p}:${i}` : null;
}

export function initialProgress(parts: Part[], startPart: number): QuestProgress {
  return {
    history: [{ kind: "step", p: startPart, i: 0 }],
    visitedAudio: [], tasks: {}, pages: [], crew: [""], firstMap: mapAt(parts, startPart, 0),
  };
}

// Изменение текста или озвучки не сбрасывает прохождение. Если поменялся порядок
// экранов или правила заданий, прежние номера экранов уже нельзя применять.
export function progressLayout(parts: Part[]): string {
  return JSON.stringify(parts.map((part) => ({
    id: part.id,
    steps: part.steps.map((step) => {
      switch (step.type) {
        case "task": return {
          type: step.type, kind: step.kind, hints: step.hints.length, page: step.givesPage,
          ...(step.kind === "choice"
            ? { options: step.options, correct: step.correct }
            : { accepted: step.accepted, maxLength: step.maxLength }),
        };
        case "vote": return { type: step.type, options: step.options, correct: step.correct };
        case "journalPage": return { type: step.type, page: step.page };
        case "walk": return { type: step.type, map: Boolean(step.point) };
        default: return { type: step.type };
      }
    }),
  })));
}

type StorageAccess = () => Pick<Storage, "getItem" | "setItem" | "removeItem">;
const browserStorage: StorageAccess = () => window.localStorage;
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const integer = (v: unknown, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= max;

function stepAt(parts: Part[], p: unknown, i: unknown): Step | undefined {
  if (!integer(p, parts.length - 1) || !integer(i, parts[p].steps.length - 1)) return;
  return parts[p].steps[i];
}

function validScreen(v: unknown, parts: Part[]): v is Screen {
  if (!isObject(v)) return false;
  if (v.kind === "end") return true;
  const step = stepAt(parts, v.p, v.i);
  if (!step) return false;
  if (v.kind === "step") return true;
  if (v.kind === "hint") return step.type === "task" && integer(v.n, step.hints.length) && v.n > 0;
  return v.kind === "found" && (step.type === "task" || step.type === "vote");
}

function validTask(v: unknown, step: Step): v is TaskState {
  if (!isObject(v) || (step.type !== "task" && step.type !== "vote")) return false;
  const hints = step.type === "task" ? step.hints.length : 0;
  const choices = step.type === "vote" || step.kind === "choice" ? step.options.length : 0;
  if (!integer(v.hints, hints) || typeof v.input !== "string" || !Array.isArray(v.wrong)) return false;
  if (!v.wrong.every((n) => integer(n, choices - 1))) return false;
  if (v.solved === null) return true;
  if (step.type === "vote") return integer(v.solved, choices - 1);
  if (step.kind === "choice") return v.solved === step.correct;
  const input = v.input.trim().toLowerCase().replaceAll("ё", "е");
  return v.solved === 0 && step.accepted.some((a) => a.trim().toLowerCase().replaceAll("ё", "е") === input);
}

export function audioScreen(parts: Part[], screen: Screen) {
  if (screen.kind === "end" || screen.kind === "hint") return null;
  const step = parts[screen.p]?.steps[screen.i];
  const clips = screen.kind === "found"
    ? step && (step.type === "task" || step.type === "vote") ? [step.afterAnswer] : null
    : step?.type === "audio" ? step.clips : null;
  return clips?.length ? { id: `${parts[screen.p].id}:${screen.i}:${screen.kind}`, clips } : null;
}

function parseProgress(value: unknown, parts: Part[]): QuestProgress | null {
  if (!isObject(value) || !Array.isArray(value.history) || !value.history.length) return null;
  if (!value.history.every((s) => validScreen(s, parts))) return null;
  if (!Array.isArray(value.crew) || !value.crew.length || !value.crew.every((n) => typeof n === "string")) return null;
  const possiblePages = new Set(parts.flatMap((p) => p.steps.flatMap((s) =>
    s.type === "task" && s.givesPage !== null ? [s.givesPage] : [])));
  if (!Array.isArray(value.pages) || !value.pages.every((p) => typeof p === "number" && possiblePages.has(p))) return null;
  if (value.firstMap !== null) {
    if (typeof value.firstMap !== "string" || !/^\d+:\d+$/.test(value.firstMap)) return null;
    const [p, i] = value.firstMap.split(":").map(Number);
    if (mapAt(parts, p, i) !== value.firstMap) return null;
  }
  if (!isObject(value.tasks)) return null;
  const tasks: Record<string, TaskState> = {};
  for (const [key, task] of Object.entries(value.tasks)) {
    if (!/^\d+:\d+$/.test(key)) return null;
    const [p, i] = key.split(":").map(Number);
    const step = stepAt(parts, p, i);
    if (!step || !validTask(task, step)) return null;
    // Анимация неверного ответа не должна проигрываться после открытия страницы.
    tasks[key] = { hints: task.hints, wrong: task.wrong, solved: task.solved, input: task.input, shake: null, shakes: 0 };
  }
  for (const screen of value.history as Screen[]) {
    if (screen.kind === "found" && tasks[`${screen.p}:${screen.i}`]?.solved == null) return null;
    if (screen.kind === "hint" && (tasks[`${screen.p}:${screen.i}`]?.hints ?? 0) < screen.n) return null;
  }
  const knownAudio = new Set(parts.flatMap((part, p) => part.steps.flatMap((_, i) =>
    (["step", "found"] as const).flatMap((kind) => {
      const audio = audioScreen(parts, { kind, p, i });
      return audio ? [audio.id] : [];
    }))));
  // Старые сохранения остаются совместимыми; известная история уже посещена.
  const visitedAudio = Array.isArray(value.visitedAudio)
    ? value.visitedAudio.filter((id): id is string => typeof id === "string" && knownAudio.has(id))
    : (value.history as Screen[]).flatMap((screen) => {
      const audio = audioScreen(parts, screen);
      return audio ? [audio.id] : [];
    });
  return {
    visitedAudio: [...new Set(visitedAudio)],
    history: value.history as Screen[], tasks, pages: [...new Set(value.pages as number[])],
    crew: value.crew as string[], firstMap: value.firstMap as string | null,
  };
}

export function readProgress(key: string, parts: Part[], storage: StorageAccess = browserStorage): QuestProgress | null {
  try {
    const raw = storage().getItem(key);
    if (!raw || raw.length > 1_000_000) return null;
    const saved: unknown = JSON.parse(raw);
    if (!isObject(saved) || saved.version !== 1 || saved.layout !== progressLayout(parts)) return null;
    return parseProgress(saved.progress, parts);
  } catch {
    // Запрет localStorage или повреждённая запись не должны мешать самому квесту.
    return null;
  }
}

export function writeProgress(key: string, parts: Part[], progress: QuestProgress, storage: StorageAccess = browserStorage): boolean {
  try {
    storage().setItem(key, JSON.stringify({ version: 1, layout: progressLayout(parts), progress }));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(key: string, storage: StorageAccess = browserStorage): boolean {
  try {
    storage().removeItem(key);
    return true;
  } catch {
    return false;
  }
}
