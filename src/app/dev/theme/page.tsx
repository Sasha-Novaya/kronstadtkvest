// Временная служебная страница: 3 варианта темы оформления. Потом удалим.
import type { Metadata } from "next";
import "@fontsource/pt-serif/400.css";
import "@fontsource/pt-serif/700.css";
import "@fontsource/pt-sans/400.css";
import "@fontsource/pt-sans/700.css";
import "@fontsource/lora/600.css";
import "@fontsource/lora/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import ThemeLab from "./ThemeLab";

export const metadata: Metadata = {
  title: "Темы оформления — служебная страница",
  robots: { index: false, follow: false },
};

export default function ThemePage() {
  return <ThemeLab />;
}
