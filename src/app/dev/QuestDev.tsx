// Служебные страницы квеста: проходят подряд старт → станция 1 → станция 2. Потом удалим.
import QuestRunner from "@/components/quest/QuestRunner";
import { kronstadtWalkParts } from "@/quests/kronstadt-walk/parts";
import { hirroSans, kronstadtWalkTheme } from "@/quests/kronstadt-walk/theme";

export default function QuestDev({ startPart }: { startPart: number }) {
  return (
    <QuestRunner
      parts={kronstadtWalkParts}
      startPart={startPart}
      theme={kronstadtWalkTheme}
      baseUrl="/quests/kronstadt-walk/"
      fontClass={hirroSans.variable}
      devRestart
    />
  );
}
