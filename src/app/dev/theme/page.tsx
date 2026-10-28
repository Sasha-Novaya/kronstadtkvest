// Временная служебная страница: тема оформления «Солнечная гавань». Потом удалим.
import type { Metadata } from "next";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import ThemeLab from "./ThemeLab";

export const metadata: Metadata = {
  title: "Тема оформления — служебная страница",
  robots: { index: false, follow: false },
};

export default function ThemePage() {
  return <ThemeLab />;
}
