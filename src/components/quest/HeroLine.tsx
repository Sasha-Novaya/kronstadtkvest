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
  label?: ReactNode;
  text: string;
  /** Дополнительное содержимое карточки (например, мини-плеер). */
  children?: ReactNode;
};

/**
 * Реплика героя. Герой всегда слева над карточкой, текст — во всю ширину карточки.
 * - stand = behind (Федот): обрезанный низ прячется за верхней рамкой.
 * - stand = onBorder (Клуша): стоит лапками на верхней рамке, поверх её границы.
 * Рамка карточки — целиком в цвет героя.
 */
export default function HeroLine({ theme, hero, image, label, text, children }: Props) {
  const settings = theme.heroes[hero];
  const img = questImage(image ?? settings.defaultImage);

  return (
    <div className={styles.line} style={heroVariables(theme, hero)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- нужны точные размеры и отражение */}
      <img
        src={img.src}
        width={img.width}
        height={img.height}
        alt={settings.name}
        className={`${styles.lineHero} ${styles[`hero_${settings.stand}`]} ${img.mirror ? styles.mirror : ""}`}
      />
      <div className={styles.lineCard}>
        <div className={styles.lineText}>
          <p className={styles.heroName}>{label ?? settings.name}</p>
          <p>{text}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
