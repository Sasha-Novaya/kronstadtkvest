// Временная служебная страница: Станция 2 и дальше по квесту, на тестовых данных. Потом удалим.
import type { Metadata } from "next";
import QuestDev from "../QuestDev";

export const metadata: Metadata = {
  title: "Станция 2 — служебная страница",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <QuestDev startPart={2} />;
}
