// Временная служебная страница: итоговая тема квеста «Солнечная гавань». Потом удалим.
import type { Metadata } from "next";
import ThemeLab from "./ThemeLab";

export const metadata: Metadata = {
  title: "Тема оформления — служебная страница",
  robots: { index: false, follow: false },
};

export default function ThemePage() {
  return <ThemeLab />;
}
