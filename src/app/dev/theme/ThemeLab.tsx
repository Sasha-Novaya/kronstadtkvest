import Image from "next/image";
import styles from "./theme.module.css";

const IMAGES = "/quests/kronstadt-walk/images/";

// Тексты — из docs/tz-stancii-1-2.md (станция 1, вступление, станция 2).
const LINES = [
  {
    hero: "fedot",
    name: "Капитан Федот Селёдкин",
    image: "fedot-1.webp",
    width: 700,
    height: 710,
    text: "Свистать всех наверх! Так. Вижу, экипаж на месте. Разрешите представиться. Капитан первого ранга в отставке. Федот Селёдкин.",
  },
  {
    hero: "klusha",
    name: "Клуша",
    image: "klusha-1.webp",
    width: 700,
    height: 699,
    text: "Зато на суше есть булочки, пирожки, пекаренки… Меня Клуша зовут! Всем привет!",
  },
] as const;

export default function ThemeLab() {
  return (
    <div className={styles.lab}>
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
            <div className={styles.lineBody}>
              <p className={styles.heroName}>{line.name}</p>
              <p className={styles.lineText}>{line.text}</p>
            </div>
            {/* Герой крупно: нижний край картинки стоит на нижней рамке карточки */}
            <Image
              className={styles.hero}
              src={IMAGES + line.image}
              alt={line.name}
              width={line.width}
              height={line.height}
              sizes="260px"
            />
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
