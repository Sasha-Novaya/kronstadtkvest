import type { ReactNode } from "react";
import type { QuestTheme } from "@/lib/theme";
import { heroVariables } from "@/lib/theme";
import { questImage } from "@/quests/kronstadt-walk/images";
import styles from "./quest.module.css";

type Props = {
  theme: QuestTheme;
  hero: string;
  image?: string;
  /** Подпись над текстом; по умолчанию — имя героя. */
  label?: string;
  text: string;
  /** Дополнительное содержимое карточки (например, мини-плеер). */
  children?: ReactNode;
};

/**
 * Реплика героя.
 * - Герой слева (Федот, макет 4): над карточкой слева, обрезанный низ прячется за верхней рамкой.
 * - Герой справа (Клуша): короткая реплика — в карточке справа, лапки ниже рамки (макет 5);
 *   длинная — стоит на верхней рамке справа, текст во всю ширину (макет 6).
 *   Порог длины — theme.lines.longTextChars.
 */
export default function HeroLine({ theme, hero, image, label, text, children }: Props) {
  const settings = theme.heroes[hero];
  const img = questImage(image ?? settings.defaultImage);
  const layout =
    settings.side === "left"
      ? "above"
      : text.length > theme.lines.longTextChars
        ? "onTop"
        : "inside";

  const picture = (
    // eslint-disable-next-line @next/next/no-img-element -- нужны точные размеры и отражение
    <img
      src={img.src}
      width={img.width}
      height={img.height}
      alt={settings.name}
      className={`${styles.lineHero} ${styles[`hero_${layout}`]} ${img.mirror ? styles.mirror : ""}`}
    />
  );

  return (
    <div className={`${styles.line} ${styles[`line_${layout}`]}`} style={heroVariables(theme, hero)}>
      {layout !== "inside" && picture}
      <div className={styles.lineCard}>
        <div className={styles.lineText}>
          <p className={styles.heroName}>{label ?? settings.name}</p>
          <p>{text}</p>
        </div>
        {children}
        {layout === "inside" && picture}
      </div>
    </div>
  );
}
