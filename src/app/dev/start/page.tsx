// Временная служебная страница: Старт и дальше по квесту, на тестовых данных. Потом удалим.
import type { Metadata } from "next";
import QuestDev from "../QuestDev";

export const metadata: Metadata = {
  title: "Старт — служебная страница",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <QuestDev startPart={0} />;
}
