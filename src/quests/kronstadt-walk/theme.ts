// Тема оформления пешего квеста kronstadt-walk — «Солнечная гавань».
// Все цвета и шрифты квеста меняются только здесь.
import localFont from "next/font/local";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import type { QuestTheme } from "@/lib/theme";

/**
 * Hirro Sans — шрифт заголовков. Автор: Дмитрий Антонов / Blue Curve Designstudio,
 * лицензия CC BY 4.0 (см. docs/licenses.md). Файлы лежат в проекте, ниоткуда не скачиваются.
 */
export const hirroSans = localFont({
  src: [
    { path: "../../fonts/hirro-sans/hirro-sans-bold.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/hirro-sans/hirro-sans-black.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-hirro-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const navy = "#0d3a6e";

export const kronstadtWalkTheme: QuestTheme = {
  colors: {
    background: "#e4f3ff",
    backgroundTexture:
      "radial-gradient(ellipse at 80% -10%, rgba(255, 214, 120, 0.45), transparent 50%), " +
      "linear-gradient(#cfeaff 0%, #eef8ff 45%, #fff7e8 100%)",
    text: "#12345a",
    muted: "#3b5779",
    heading: navy,
    accent: "#e86a00",
    primary: "#1458b8",
    primaryText: "#ffffff",
    surface: "#ffffff",
    border: "#2f69b8",
    track: "#c9dcf0",
    inputBackground: "#ffffff",
  },
  fonts: {
    heading: "var(--font-hirro-sans)",
    body: '"Nunito", system-ui, sans-serif',
  },
  shape: {
    radius: "22px",
    buttonRadius: "999px",
    shadow: "0 8px 22px rgba(20, 88, 184, 0.14)",
  },
  heroes: {
    // Федот — слева над карточкой реплики (макет 4).
    fedot: { name: "Капитан Селёдкин", color: navy, side: "left", defaultImage: "F1" },
    // Клуша — справа, стоит на верхней рамке (макет 6).
    klusha: { name: "Клуша", color: "#543e34", side: "right", defaultImage: "K1" },
  },
  lines: {
    // Реплика длиннее этого числа символов — Клуша стоит на рамке (макет 6), короче — внутри
    // карточки (макет 5). Саша 29.10.2026: Клуша на карточках всегда стоит на рамке, поэтому 0.
    longTextChars: 0,
  },
};
