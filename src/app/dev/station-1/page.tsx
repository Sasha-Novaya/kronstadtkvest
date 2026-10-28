// Временная служебная страница: пошаговые экраны станции 1 на тестовых данных. Потом удалим.
import type { Metadata } from "next";
import StationRunner from "@/components/quest/StationRunner";
import station from "@/quests/kronstadt-walk/content/station-1.json";
import { hirroSans, kronstadtWalkTheme } from "@/quests/kronstadt-walk/theme";
import type { Station } from "@/quests/types";

export const metadata: Metadata = {
  title: "Станция 1 — служебная страница",
  robots: { index: false, follow: false },
};

export default function Station1Page() {
  return (
    <StationRunner
      station={station as Station}
      theme={kronstadtWalkTheme}
      baseUrl="/quests/kronstadt-walk/"
      fontClass={hirroSans.variable}
      devRestart
    />
  );
}
