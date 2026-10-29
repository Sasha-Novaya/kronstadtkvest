// Стрелка «Назад» — рисунок Саши (29.10.2026): синяя, с тёмно-синим контуром и тенью снизу.
// Цвета внутри не меняем. Исходная стрелка смотрит вправо, отражение — внутри рисунка.

export default function BackArrow({ width = 42 }: { width?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 860 720"
      width={width}
      height={Math.round((width * 720) / 860)}
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", flex: "none" }}
    >
      <g transform="translate(860,0) scale(-1,1)" strokeWidth="44" strokeLinejoin="round">
        <path
          d="M40 235L440 268L395 80L815 350L395 640L440 445L40 480Z"
          transform="translate(0,26)"
          fill="#12346e"
          stroke="#12346e"
        />
        <path d="M40 235L440 268L395 80L815 350L395 640L440 445L40 480Z" fill="#2a6fd6" stroke="#12346e" />
      </g>
    </svg>
  );
}
