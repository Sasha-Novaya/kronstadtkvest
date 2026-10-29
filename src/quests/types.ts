// Формат сценария квеста (JSON в src/quests/<квест>/content/).
// Повторяет «Модель данных» из docs/tz-stancii-1-2.md.
// Квест — это части (старт, станция 1, станция 2…), часть — шаги, один шаг — один экран.

export type Visual = {
  /** Секунды от начала куска — когда есть настоящая озвучка с метками. */
  at?: number;
  /** Пока меток нет: картинка меняется там, где в тексте куска начинается эта фраза. */
  atText?: string;
  image: string;
};

export type Clip = {
  id: string;
  speaker: string;
  /** Путь к файлу от папки квеста, например audio/st1-01.mp3. */
  file: string;
  paragraphs: string[];
  visuals?: Visual[];
  /** Картинка на весь кусок (если нет visuals). */
  image?: string;
};

/** Шапка экрана: оранжевая подпись (null — без неё) и заголовок. */
export type Header = { kicker: string | null; title: string };

export type Point = { name: string; lat: number; lon: number };

type Base = {
  /** Своя шапка шага; по умолчанию — шапка части. */
  header?: Header;
};

export type AudioStep = Base & {
  type: "audio";
  clips: Clip[];
  /** Ориентир над героем; по умолчанию — ориентир части, null — без ориентира. */
  landmark?: string | null;
};

type TaskCommon = {
  question: string;
  hints: string[];
  hintHero: string;
  hintImage: string;
  givesPage: number | null;
  afterAnswer: Clip & { image: string };
};

export type ChoiceTaskStep = Base &
  TaskCommon & {
    type: "task";
    kind: "choice";
    options: string[];
    correct: number;
  };

export type NumberTaskStep = Base &
  TaskCommon & {
    type: "task";
    kind: "number";
    /** Допустимые ответы; первый показывается по «Узнать ответ». */
    accepted: string[];
    maxLength: number;
  };

/** «Правда или легенда?»: любой ответ сразу ведёт к разгадке, верный подсвечивается зелёным. */
export type VoteStep = Base & {
  type: "vote";
  hero: string;
  image: string;
  label: string;
  text: string;
  options: string[];
  correct: number;
  afterAnswer: Clip & { image: string };
};

/** Выбор, который запоминается в переменную квеста (например, автобус). */
export type PickStep = Base & {
  type: "pick";
  variable: string;
  paragraphs: string[];
  options: string[];
};

/** Путь: текст (может зависеть от переменной), «Вы на месте, если…», мини-карта, кнопка. */
export type WalkStep = Base & {
  type: "walk";
  text: string | { variable: string; options: Record<string, string> };
  arrival: string;
  point: Point | null;
  button: string;
};

/** Запись экипажа: имена для грамоты. */
export type CrewStep = Base & {
  type: "crew";
  image: string;
  text: string;
  fieldLabel: string;
  addLabel: string;
  button: string;
};

/** Памятка: пункты со значками, совет, кнопка. */
export type MemoStep = Base & {
  type: "memo";
  items: { icon: "play" | "question" | "hint" | "book" | "next" | "pause"; label: string; text: string }[];
  note: string;
  button: string;
};

export type JournalPageStep = Base & { type: "journalPage"; page: number; text: string };

export type TipStep = Base & { type: "tip"; hero: string; image: string; text: string };

export type TaskStep = ChoiceTaskStep | NumberTaskStep;

export type Step =
  | AudioStep
  | TaskStep
  | VoteStep
  | PickStep
  | WalkStep
  | CrewStep
  | MemoStep
  | JournalPageStep
  | TipStep;

export type Part = {
  id: string;
  /** Полное название по ТЗ (для справки). */
  fullTitle: string;
  header: Header;
  landmark?: string;
  steps: Step[];
};
