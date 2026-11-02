import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { audioScreen, clearProgress, freshTask, initialProgress, progressLayout, readProgress, writeProgress } from "../src/lib/questProgress.ts";

const parts = ["start", "station-1", "station-2"].map((name) =>
  JSON.parse(readFileSync(new URL(`../src/quests/kronstadt-walk/content/${name}.json`, import.meta.url), "utf8")));
const key = "kronstadtkvest:progress:kronstadt-walk";
function memory() {
  const data = new Map();
  return {
    data,
    storage: () => ({ getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) }),
  };
}
function completed() {
  return {
    ...initialProgress(parts, 0),
    history: [
      { kind: "step", p: 0, i: 0 },
      { kind: "step", p: 1, i: 1 },
      { kind: "hint", p: 1, i: 1, n: 2 },
      { kind: "found", p: 1, i: 1 },
      { kind: "step", p: 2, i: 5 },
    ],
    crew: ["Саша", "Миша"], pages: [1, 2],
    tasks: {
      "1:1": { ...freshTask, hints: 2, wrong: [0], solved: 1 },
      "2:1": { ...freshTask, solved: 0 }, // Неверное голосование тоже завершает рубрику.
      "2:4": { ...freshTask, solved: 0, input: "1723" },
    },
  };
}

test("все данные прохождения восстанавливаются вместе", () => {
  const { storage } = memory();
  const progress = completed();
  assert.equal(writeProgress(key, parts, progress, storage), true);
  assert.deepEqual(readProgress(key, parts, storage), progress);
});

test("подсказка и её номер восстанавливаются как текущий экран", () => {
  const { storage } = memory();
  const progress = completed();
  progress.history = progress.history.slice(0, 3);
  writeProgress(key, parts, progress, storage);
  assert.deepEqual(readProgress(key, parts, storage).history.at(-1), { kind: "hint", p: 1, i: 1, n: 2 });
});

test("ответ и награда сохранены даже до отложенного перехода к реплике", () => {
  const { storage } = memory();
  const progress = completed();
  progress.history = [{ kind: "step", p: 1, i: 1 }];
  writeProgress(key, parts, progress, storage);
  const restored = readProgress(key, parts, storage);
  assert.equal(restored.tasks["1:1"].solved, 1);
  assert.deepEqual(restored.pages, [1, 2]);
});

test("восстанавливается недописанный ответ, а анимация ошибки сбрасывается", () => {
  const { storage } = memory();
  const progress = completed();
  progress.tasks["2:4"] = { ...freshTask, input: "17", shake: 0, shakes: 3 };
  writeProgress(key, parts, progress, storage);
  assert.deepEqual(readProgress(key, parts, storage).tasks["2:4"], { ...freshTask, input: "17" });
});

test("отсутствующая, повреждённая и неподдерживаемая запись безопасны", () => {
  const { storage, data } = memory();
  assert.equal(readProgress(key, parts, storage), null);
  data.set(key, "{");
  assert.equal(readProgress(key, parts, storage), null);
  data.set(key, JSON.stringify({ version: 999, layout: progressLayout(parts), progress: completed() }));
  assert.equal(readProgress(key, parts, storage), null);
});

test("ошибочные номера экранов, подсказок и ответы отклоняются", () => {
  const { storage } = memory();
  const changes = [
    (p) => { p.history = [{ kind: "step", p: 500, i: 0 }]; },
    (p) => { p.history = []; },
    (p) => { p.history = [{ kind: "hint", p: 1, i: 1, n: 3 }]; },
    (p) => { p.history = [{ kind: "found", p: 0, i: 0 }]; },
    (p) => { p.tasks["1:1"].solved = 0; },
    (p) => { p.tasks["2:4"].input = "9999"; },
    (p) => { p.pages = [999]; },
    (p) => { p.firstMap = "999:0"; },
    (p) => { p.crew = [null]; },
    (p) => { p.tasks["1:1"].hints = 0; },
  ];
  for (const change of changes) {
    const progress = completed();
    change(progress);
    writeProgress(key, parts, progress, storage);
    assert.equal(readProgress(key, parts, storage), null);
  }
});

test("редактирование текста не сбрасывает прогресс, перестановка шагов — несовместима", () => {
  const { storage } = memory();
  const progress = completed();
  writeProgress(key, parts, progress, storage);
  const edited = structuredClone(parts);
  edited[0].steps[0].text = "Новый текст ориентира";
  assert.deepEqual(readProgress(key, edited, storage), progress);
  edited[1].steps.reverse();
  assert.equal(readProgress(key, edited, storage), null);
});

test("запрет браузером доступа и переполнение не вызывают падение", () => {
  const forbidden = () => { throw new Error("SecurityError"); };
  assert.equal(readProgress(key, parts, forbidden), null);
  assert.equal(writeProgress(key, parts, completed(), forbidden), false);
  assert.equal(clearProgress(key, forbidden), false);
  const full = () => ({ getItem: () => null, setItem: () => { throw new Error("QuotaExceededError"); }, removeItem: () => {} });
  assert.equal(writeProgress(key, parts, completed(), full), false);
});

test("сброс удаляет только запись данного квеста", () => {
  const { storage, data } = memory();
  writeProgress(key, parts, completed(), storage);
  data.set("another-app", "keep");
  assert.equal(clearProgress(key, storage), true);
  assert.equal(readProgress(key, parts, storage), null);
  assert.equal(data.get("another-app"), "keep");
});

test("без сохранения каждая служебная страница начинает со своей части", () => {
  for (const start of [0, 1, 2]) {
    assert.deepEqual(initialProgress(parts, start).history, [{ kind: "step", p: start, i: 0 }]);
  }
});

test("служебный конец тоже восстанавливается", () => {
  const { storage } = memory();
  const progress = completed();
  progress.history.push({ kind: "end" });
  writeProgress(key, parts, progress, storage);
  assert.equal(readProgress(key, parts, storage).history.at(-1).kind, "end");
});

test("аудиоэкраны различаются внутри станции и сохраняются после возврата", () => {
  const p = initialProgress(parts, 0);
  const ids = parts.flatMap((part, index) => part.steps.flatMap((_, i) => {
    const audio = audioScreen(parts, {kind: "step", p: index, i});
    return audio ? [audio.id] : [];
  }));
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(ids.length > 3);
  p.visitedAudio = ids;
  const m = memory();
  writeProgress(key, parts, p, m.storage);
  assert.deepEqual(readProgress(key, parts, m.storage).visitedAudio, ids);
  assert.deepEqual(initialProgress(parts, 0).visitedAudio, []);
});

test("старое сохранение восстанавливается без повторного запуска известных экранов", () => {
  const m = memory();
  const p = completed();
  delete p.visitedAudio;
  writeProgress(key, parts, p, m.storage);
  const restored = readProgress(key, parts, m.storage);
  assert.deepEqual(restored.crew, p.crew);
  assert.deepEqual(restored.pages, p.pages);
  assert.ok(restored.visitedAudio.includes(audioScreen(parts, {kind:"found",p:1,i:1}).id));
});
