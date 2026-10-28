// Картинки квеста: код → готовый файл, размеры и настройки показа.
// Список файлов и размеров делает scripts/process-images.py (images.json).
import manifest from "./images.json";

export type QuestImage = {
  id: string;
  src: string;
  width: number;
  height: number;
  /** Герой с прозрачным фоном (может выглядывать из-за рамки). */
  hero: boolean;
  /** Показывать зеркально отражённой. */
  mirror: boolean;
};

const BASE = "/quests/kronstadt-walk/images/";

// Зеркальное отражение — настройка картинки, а не отдельный файл.
// К1 (машет крылом) всегда отражаем, чтобы Клуша смотрела к тексту.
// Картинки с надписями (К4 «Правда или легенда?») не отражаем никогда.
const MIRRORED = new Set(["K1"]);

const images = new Map<string, QuestImage>(
  manifest.map((m) => [
    m.id,
    {
      id: m.id,
      src: BASE + m.file,
      width: m.width,
      height: m.height,
      hero: m.kind === "hero",
      mirror: MIRRORED.has(m.id),
    },
  ]),
);

export function questImage(id: string): QuestImage {
  const image = images.get(id);
  if (!image) throw new Error(`Нет картинки с кодом ${id}`);
  return image;
}
