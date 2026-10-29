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
  /** На картинке надпись — отражать нельзя никогда. */
  hasText: boolean;
  /** Можно открыть на весь экран (фото, схемы, иллюстрации, журнал) — не герои и не интерфейс. */
  zoomable: boolean;
};

const BASE = "/quests/kronstadt-walk/images/";

// Зеркальное отражение — настройка картинки, а не отдельный файл.
// Герой стоит слева от текста и должен смотреть вправо — к заголовку и тексту.
// Здесь перечислены картинки героев, которые в исходнике смотрят ВЛЕВО: их отражаем.
// Проверено 29.10.2026: все картинки Клуши (К1–К6) смотрят вправо — список пуст.
const FACING_LEFT = new Set<string>([]);
// Картинки с надписями не отражаем никогда (буквы стали бы зеркальными).
const HAS_TEXT = new Set(["K4", "K4b"]);
// Не открываются на весь экран: герои и мини-карта (по ней открываются Яндекс Карты).
const NOT_ZOOMABLE = new Set(["mini-map"]);

const images = new Map<string, QuestImage>(
  manifest.map((m) => [
    m.id,
    {
      id: m.id,
      src: BASE + m.file,
      width: m.width,
      height: m.height,
      hero: m.kind === "hero",
      mirror: FACING_LEFT.has(m.id) && !HAS_TEXT.has(m.id),
      hasText: HAS_TEXT.has(m.id),
      zoomable: m.kind === "flat" && !NOT_ZOOMABLE.has(m.id),
    },
  ]),
);

export function questImage(id: string): QuestImage {
  const image = images.get(id);
  if (!image) throw new Error(`Нет картинки с кодом ${id}`);
  return image;
}
