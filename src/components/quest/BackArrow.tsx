// Стрелка «Назад» — рисунок Саши (29.10.2026): цвет гюйса Клуши, без обводки, тонкая тень снизу.
// Цвета внутри не меняем. Исходная стрелка смотрит вправо, отражение — внутри рисунка.
// Высота — примерно на 20% больше строки «СТАНЦИЯ N».

export default function BackArrow({ height = 24 }: { height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 860 720"
      width={Math.round((height * 860) / 720)}
      height={height}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flex: "none" }}
    >
      <g transform="translate(860,0) scale(-1,1)" strokeWidth="60" strokeLinejoin="round">
        <path
          d="M40 235L440 268L395 80L815 350L395 640L440 445L40 480Z"
          transform="translate(0,26)"
          fill="#3d74c4"
          stroke="#3d74c4"
        />
        <path d="M40 235L440 268L395 80L815 350L395 640L440 445L40 480Z" fill="#5a96e6" stroke="#5a96e6" />
      </g>
    </svg>
  );
}
