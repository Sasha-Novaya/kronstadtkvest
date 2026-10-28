// Формат сценария станции (JSON в src/quests/<квест>/content/).
// Повторяет «Модель данных» из docs/tz-stancii-1-2.md.

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

export type AudioStep = { type: "audio"; clips: Clip[] };

export type ChoiceTaskStep = {
  type: "task";
  kind: "choice";
  question: string;
  options: string[];
  correct: number;
  hints: string[];
  hintHero: string;
  hintImage: string;
  givesPage: number | null;
  afterAnswer: Clip & { image: string };
};

export type JournalPageStep = { type: "journalPage"; page: number; text: string };

export type TipStep = { type: "tip"; hero: string; image: string; text: string };

export type Step = AudioStep | ChoiceTaskStep | JournalPageStep | TipStep;

export type Station = {
  id: string;
  number: number;
  title: string;
  landmark: string;
  steps: Step[];
  next: {
    text: string;
    arrival: string;
    point: { name: string; lat: number; lon: number };
    button: string;
  };
};
