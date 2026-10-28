"use client";

import { useState } from "react";
import styles from "./theme.module.css";

const IMAGES = "/quests/kronstadt-walk/images/";

const THEMES = [
  { id: "journal", name: "Судовой журнал" },
  { id: "night", name: "Ночной рейд" },
  { id: "harbor", name: "Солнечная гавань" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

// Тексты — из docs/tz-stancii-1-2.md (станция 1, вступление, станция 2).
const LINES = [
  {
    hero: "fedot",
    name: "Капитан Федот Селёдкин",
    image: "fedot-1.webp",
    text: "Свистать всех наверх! Так. Вижу, экипаж на месте. Разрешите представиться. Капитан первого ранга в отставке. Федот Селёдкин.",
  },
  {
    hero: "klusha",
    name: "Клуша",
    image: "klusha-1.webp",
    text: "Зато на суше есть булочки, пирожки, пекаренки… Меня Клуша зовут! Всем привет!",
  },
] as const;

export default function ThemeLab() {
  const [theme, setTheme] = useState<ThemeId>("journal");

  return (
    <div className={styles.lab} data-theme={theme}>
      <nav className={styles.switcher} aria-label="Вариант оформления">
        {THEMES.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={styles.switch}
            aria-pressed={theme === t.id}
            onClick={() => setTheme(t.id)}
          >
            {i + 1}. {t.name}
          </button>
        ))}
      </nav>

      <main className={styles.screen}>
        <p className={styles.kicker}>Станция 1</p>
        <h1 className={styles.title}>Куда вы попали + Поющий фонтан</h1>
        <p className={styles.text}>
          🧭 Встаньте лицом к фонтану, спиной к Гостиному двору — большому
          жёлтому зданию.
        </p>

        <section className={styles.player} aria-label="Аудиоплеер (образец)">
          <button type="button" className={`${styles.button} ${styles.primary} ${styles.listen}`}>
            ▶ Слушать
          </button>
          <div className={styles.track}>
            <div className={styles.trackFill} />
          </div>
          <div className={styles.time}>
            <span>0:42</span>
            <span>1:58</span>
          </div>
          <div className={styles.controls}>
            <button type="button" className={styles.control}>↺ 10 с</button>
            <button type="button" className={styles.control}>⏸ Пауза</button>
            <button type="button" className={styles.control}>⟳ Снова</button>
          </div>
          <button type="button" className={styles.textToggle}>Текст ▾</button>
        </section>

        {LINES.map((line) => (
          <article key={line.hero} className={styles.line} data-hero={line.hero}>
            <div
              className={styles.avatar}
              data-hero={line.hero}
              style={{ backgroundImage: `url(${IMAGES}${line.image})` }}
              role="img"
              aria-label={line.name}
            />
            <div>
              <p className={styles.heroName}>{line.name}</p>
              <p className={styles.lineText}>{line.text}</p>
            </div>
          </article>
        ))}

        <section className={styles.task}>
          <label htmlFor="answer" className={styles.question}>
            На стенах домов висят памятные доски с событиями из истории города.
            Найдите: в каком году город получил своё имя — Кронштадт? Впишите год.
          </label>
          <input
            id="answer"
            className={styles.input}
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
          />
          <div className={styles.buttons}>
            <button type="button" className={`${styles.button} ${styles.primary}`}>
              Проверить
            </button>
            <button type="button" className={`${styles.button} ${styles.secondary}`}>
              💡 Подсказка
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
