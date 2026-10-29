// Свои значки интерфейса (вместо эмодзи): простые округлые формы в стиле темы.
// Цвет берут от текста рядом (currentColor).

export type IconName =
  | "play"
  | "pause"
  | "back10"
  | "replay"
  | "compass"
  | "hint"
  | "close"
  | "question"
  | "book"
  | "next";

const paths: Record<IconName, React.ReactNode> = {
  // Треугольник «play» со скруглёнными углами
  play: <path d="M8 5.6c0-1.2 1.3-1.9 2.3-1.3l9.4 6.4c.9.6.9 1.9 0 2.5l-9.4 6.4c-1 .7-2.3 0-2.3-1.2z" fill="currentColor" />,
  // Пауза — две полоски, без квадрата
  pause: (
    <>
      <rect x="6" y="4.5" width="4.2" height="15" rx="2" fill="currentColor" />
      <rect x="13.8" y="4.5" width="4.2" height="15" rx="2" fill="currentColor" />
    </>
  ),
  // Назад на 10 секунд: стрелка против часовой и «10»
  back10: (
    <>
      <path d="M5 12a7.5 7.5 0 1 0 2.4-5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4.2 3.6v4.2h4.2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12.6" y="15.3" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor" fontFamily="system-ui, sans-serif">10</text>
    </>
  ),
  // Прослушать снова: круговая стрелка
  replay: (
    <>
      <path d="M19 12a7 7 0 1 1-2.2-5.1" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M19.6 3.4v4.4h-4.4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // Компас для ориентира: оранжевая стрелка на север
  compass: (
    <>
      <circle cx="12" cy="12" r="9.2" fill="#fff" stroke="currentColor" strokeWidth="2.2" />
      <path d="M12 4.8l2.6 7.2h-5.2z" fill="var(--accent, #e86a00)" />
      <path d="M12 19.2l-2.6-7.2h5.2z" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="#fff" />
    </>
  ),
  // Лампочка-подсказка
  hint: (
    <>
      <path d="M12 3.2a6.3 6.3 0 0 0-3.7 11.4c.6.5 1 1.2 1 2v.6h5.4v-.6c0-.8.4-1.5 1-2A6.3 6.3 0 0 0 12 3.2z" fill="#ffd34d" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9.6 19.6h4.8M10.4 21.6h3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />,
  // Задание: вопросительный знак в кружке
  question: (
    <>
      <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" strokeWidth="2.2" />
      <path d="M9.2 9.4a2.9 2.9 0 1 1 4 2.7c-.8.4-1.2 1-1.2 1.8v.6" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <circle cx="12" cy="17.4" r="1.4" fill="currentColor" />
    </>
  ),
  // Страница журнала: раскрытая книга
  book: (
    <>
      <path d="M12 6.6C10 5 7 4.6 3.5 5.2v13c3.5-.6 6.5-.2 8.5 1.4 2-1.6 5-2 8.5-1.4v-13C17 4.6 14 5 12 6.6z" fill="#f6e7c4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 6.6v13" stroke="currentColor" strokeWidth="2" />
    </>
  ),
  // Далее: стрелка вправо
  next: <path d="M4 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />,
};

export default function Icon({ name, size = 22, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ flex: "none", display: "inline-block", verticalAlign: "middle" }}
    >
      {paths[name]}
    </svg>
  );
}
