"use client";

import { useState } from "react";
import type { QuestTheme } from "@/lib/theme";
import { heroVariables, themeVariables } from "@/lib/theme";
import { questImage } from "@/quests/kronstadt-walk/images";
import type { AudioStep, ChoiceTaskStep, Clip, Station, Step } from "@/quests/types";
import HeroLine from "./HeroLine";
import { estimate, formatTime, useClipPlayer, visualAt, type ClipPlayer } from "./useClipPlayer";
import styles from "./quest.module.css";

type Props = {
  station: Station;
  theme: QuestTheme;
  /** Папка квеста в public, например /quests/kronstadt-walk/ */
  baseUrl: string;
  /** Класс шрифта заголовков (next/font). */
  fontClass: string;
  /** Служебная кнопка «Начать заново» (только на /dev-страницах). */
  devRestart?: boolean;
};

/** Где мы внутри шага: основной экран, экран подсказки или экран «Есть страница!». */
type Sub = { kind: "main" } | { kind: "hint"; n: number } | { kind: "found" };

type TaskState = { hints: number; wrong: number[]; shake: number | null; solved: number | null };

const freshTask: TaskState = { hints: 0, wrong: [], shake: null, solved: null };

export default function StationRunner({ station, theme, baseUrl, fontClass, devRestart }: Props) {
  const player = useClipPlayer(baseUrl);
  const [stepIndex, setStepIndex] = useState(0);
  const [sub, setSub] = useState<Sub>({ kind: "main" });
  const [task, setTask] = useState<TaskState>(freshTask);
  const [pages, setPages] = useState<number[]>([]);
  // В конце шагов станции — экран перехода, затем служебный «конец».
  const [phase, setPhase] = useState<"steps" | "walk" | "done">("steps");

  const step: Step | undefined = station.steps[stepIndex];

  const nextStep = () => {
    player.stop();
    setSub({ kind: "main" });
    setTask(freshTask);
    if (stepIndex + 1 < station.steps.length) setStepIndex(stepIndex + 1);
    else setPhase("walk");
  };

  const restart = () => {
    player.stop();
    setStepIndex(0);
    setSub({ kind: "main" });
    setTask(freshTask);
    setPages([]);
    setPhase("steps");
  };

  let screen: React.ReactNode;
  if (phase === "walk") {
    screen = <WalkScreen station={station} onNext={() => setPhase("done")} />;
  } else if (phase === "done") {
    screen = <DoneScreen station={station} pages={pages} onRestart={restart} />;
  } else if (step?.type === "audio") {
    screen = (
      <ListenScreen key={stepIndex} station={station} step={step} theme={theme} player={player} onNext={nextStep} />
    );
  } else if (step?.type === "task" && sub.kind === "hint") {
    screen = (
      <Frame station={station} footer={<NextButton onClick={() => setSub({ kind: "main" })} />}>
        <div className={styles.center}>
          <HeroLine
            theme={theme}
            hero={step.hintHero}
            image={step.hintImage}
            label={`💡 Подсказка ${sub.n} из ${step.hints.length}`}
            text={step.hints[sub.n - 1]}
          />
        </div>
      </Frame>
    );
  } else if (step?.type === "task" && sub.kind === "found") {
    screen = (
      <Frame station={station} footer={<NextButton onClick={nextStep} />}>
        <div className={styles.center}>
          <HeroLine
            theme={theme}
            hero={step.afterAnswer.speaker}
            image={step.afterAnswer.image}
            text={step.afterAnswer.paragraphs.join("\n\n")}
          >
            <MiniPlayer player={player} />
          </HeroLine>
        </div>
      </Frame>
    );
  } else if (step?.type === "task") {
    const answer = (i: number) => {
      // Звук после ответа запускаем прямо в нажатии — иначе iPhone его не включит.
      player.start([step.afterAnswer]);
      if (step.givesPage) setPages((p) => [...p, step.givesPage as number]);
      setTask((t) => ({ ...t, solved: i, shake: null }));
      setTimeout(() => setSub({ kind: "found" }), 900);
    };
    screen = (
      <TaskScreen
        station={station}
        step={step}
        state={task}
        onChoose={(i) => {
          if (task.solved !== null || task.wrong.includes(i)) return;
          if (i === step.correct) answer(i);
          else setTask((t) => ({ ...t, wrong: [...t.wrong, i], shake: i }));
        }}
        onHint={() => {
          const n = task.hints + 1;
          setTask((t) => ({ ...t, hints: n, shake: null }));
          setSub({ kind: "hint", n });
        }}
        onReveal={() => answer(step.correct)}
      />
    );
  } else if (step?.type === "journalPage") {
    screen = (
      <Frame station={station} footer={<NextButton onClick={nextStep} />}>
        <article
          className={styles.journal}
          style={{ backgroundImage: `url(${questImage("J2").src})` }}
        >
          <p className={styles.journalTitle}>📖 Страница журнала №{step.page}</p>
          <p className={styles.journalText}>{step.text}</p>
        </article>
      </Frame>
    );
  } else if (step?.type === "tip") {
    screen = (
      <Frame station={station} footer={<NextButton onClick={nextStep} />}>
        <div className={styles.center}>
          <HeroLine theme={theme} hero={step.hero} image={step.image} label="🐦 Клуша советует" text={step.text} />
        </div>
      </Frame>
    );
  }

  return (
    <div className={`${styles.app} ${fontClass}`} style={themeVariables(theme)}>
      {devRestart && (
        <div className={styles.devbar}>
          <span>Служебная страница</span>
          <button type="button" className={styles.devButton} onClick={restart}>
            ↺ Начать заново
          </button>
        </div>
      )}
      {screen}
    </div>
  );
}

/* ---------- Общая рамка экрана: шапка, середина, кнопка внизу ---------- */

function Frame({
  station,
  title,
  footer,
  children,
}: {
  station: Station;
  title?: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.screen}>
      <header className={styles.head}>
        <p className={styles.kicker}>Станция {station.number}</p>
        <h1 className={styles.title}>{title ?? station.title}</h1>
      </header>
      <div className={styles.body}>{children}</div>
      <footer className={styles.foot}>{footer}</footer>
    </main>
  );
}

function NextButton({ onClick, disabled, label = "Далее" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" className={`${styles.button} ${styles.primary} ${styles.wide}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

/* ---------- Экран «Слушать» (макет 1) ---------- */

function ListenScreen({
  station,
  step,
  theme,
  player,
  onNext,
}: {
  station: Station;
  step: AudioStep;
  theme: QuestTheme;
  player: ClipPlayer;
  onNext: () => void;
}) {
  const [readOpen, setReadOpen] = useState(false);
  const [readOnce, setReadOnce] = useState(false);
  const mine = player.clips === step.clips || player.clips[0]?.id === step.clips[0].id;
  const status = mine ? player.status : "idle";
  const clip: Clip = (mine && player.clip) || step.clips[0];
  const imageId = visualAt(
    clip,
    mine ? player.clipTime : 0,
    mine ? player.clipDuration : 1,
    theme.heroes[clip.speaker]?.defaultImage ?? "F1",
  );
  const image = questImage(imageId);
  const listened = status === "ended" || readOnce;
  // До первого нажатия длительность оцениваем по тексту — чтобы сразу было видно, сколько слушать.
  const total = mine ? player.total : step.clips.reduce((sum, c) => sum + estimate(c), 0);

  const mainButton =
    status === "playing"
      ? { label: "⏸ Пауза", action: player.pause }
      : status === "paused"
        ? { label: "▶ Продолжить", action: player.play }
        : status === "ended"
          ? { label: "⟳ Прослушать снова", action: player.play }
          : { label: "▶ Слушать", action: () => player.start(step.clips) };

  return (
    <Frame station={station} footer={<NextButton onClick={onNext} disabled={!listened} />}>
      <p className={styles.landmark}>🧭 {station.landmark}</p>
      <div className={styles.stage}>
        {/* eslint-disable-next-line @next/next/no-img-element -- картинка меняется по ходу аудио */}
        <img
          key={image.id}
          src={image.src}
          width={image.width}
          height={image.height}
          alt=""
          className={`${image.hero ? styles.stageHero : styles.stageIllustration} ${image.mirror ? styles.mirror : ""}`}
        />
      </div>
      <section className={styles.playerCard}>
        <button type="button" className={`${styles.button} ${styles.primary} ${styles.listen}`} onClick={mainButton.action}>
          {mainButton.label}
        </button>
        <div className={styles.track}>
          <div className={styles.trackFill} style={{ width: total ? `${(player.elapsed / total) * 100}%` : "0%" }} />
        </div>
        <div className={styles.time}>
          <span>{formatTime(mine ? player.elapsed : 0)}</span>
          {mine && status !== "idle" && (
            <button type="button" className={styles.back10} onClick={player.back10}>
              ↺ назад 10 с
            </button>
          )}
          <span>{formatTime(total)}</span>
        </div>
        <button
          type="button"
          className={`${styles.button} ${styles.secondary}`}
          onClick={() => {
            setReadOpen(true);
            setReadOnce(true);
          }}
        >
          Читать самим
        </button>
      </section>
      {readOpen && <ReadSheet clips={step.clips} theme={theme} onClose={() => setReadOpen(false)} />}
    </Frame>
  );
}

/** Полный текст эпизода; реплики выделены цветом и именем героя (ТЗ платформы, П7). */
function ReadSheet({ clips, theme, onClose }: { clips: Clip[]; theme: QuestTheme; onClose: () => void }) {
  return (
    <div className={styles.sheetBackdrop} role="dialog" aria-modal="true" aria-label="Читать самим">
      <div className={styles.sheet}>
        <div className={styles.sheetHead}>
          <p className={styles.kicker}>Читать самим</p>
          <button type="button" className={styles.sheetClose} onClick={onClose}>
            ✕ Закрыть
          </button>
        </div>
        <div className={styles.sheetBody}>
          {clips.map((clip) => (
            <section key={clip.id} className={styles.sheetClip} style={heroVariables(theme, clip.speaker)}>
              <p className={styles.heroName}>{theme.heroes[clip.speaker]?.name}</p>
              {clip.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Мини-плеер в карточке реплики (реплика после ответа играет сама). */
function MiniPlayer({ player }: { player: ClipPlayer }) {
  const playing = player.status === "playing";
  return (
    <div className={styles.miniPlayer}>
      <button
        type="button"
        className={styles.miniButton}
        onClick={playing ? player.pause : player.play}
        aria-label={playing ? "Пауза" : "Слушать"}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <div className={styles.track}>
        <div
          className={styles.trackFill}
          style={{ width: player.total ? `${(player.elapsed / player.total) * 100}%` : "0%" }}
        />
      </div>
    </div>
  );
}

/* ---------- Задание: выбор из нескольких вариантов ---------- */

function TaskScreen({
  station,
  step,
  state,
  onChoose,
  onHint,
  onReveal,
}: {
  station: Station;
  step: ChoiceTaskStep;
  state: TaskState;
  onChoose: (i: number) => void;
  onHint: () => void;
  onReveal: () => void;
}) {
  const allHints = state.hints >= step.hints.length;
  const footer =
    state.solved !== null ? null : allHints ? (
      <NextButton onClick={onReveal} label="Узнать ответ" />
    ) : (
      <button type="button" className={`${styles.button} ${styles.secondary} ${styles.wide}`} onClick={onHint}>
        💡 Подсказка
      </button>
    );

  return (
    <Frame station={station} footer={footer}>
      <div className={styles.taskCard}>
        <p className={styles.question}>{step.question}</p>
        <div className={styles.options}>
          {step.options.map((option, i) => {
            const wrong = state.wrong.includes(i);
            const right = state.solved === i;
            return (
              <button
                key={`${option}-${wrong}-${state.shake === i}`}
                type="button"
                className={[
                  styles.option,
                  wrong ? styles.optionWrong : "",
                  state.shake === i ? styles.shake : "",
                  right ? styles.optionRight : "",
                ].join(" ")}
                disabled={wrong || state.solved !== null}
                onClick={() => onChoose(i)}
              >
                {option}
              </button>
            );
          })}
        </div>
        <p className={styles.feedback} aria-live="polite">
          {state.shake !== null ? "Не совсем. Попробуйте ещё!" : ""}
        </p>
      </div>
    </Frame>
  );
}

/* ---------- Переход к следующей станции ---------- */

function WalkScreen({ station, onNext }: { station: Station; onNext: () => void }) {
  const { point } = station.next;
  // Пешеходный маршрут в Яндекс Картах от местоположения к точке (ТЗ платформы, раздел 11).
  const mapUrl = `https://yandex.ru/maps/?rtext=~${point.lat},${point.lon}&rtt=pd`;
  return (
    <Frame station={station} title="Как дойти" footer={<NextButton onClick={onNext} label={station.next.button} />}>
      <article className={styles.walkCard}>
        <div className={styles.walkText}>
          <a
            className={styles.miniMap}
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${point.name}: открыть в Яндекс Картах`}
          >
            <span className={styles.miniMapPin} aria-hidden="true">📍</span>
            <span className={styles.miniMapLink}>
              Открыть
              <br />
              карту ↗
            </span>
          </a>
          <p>{station.next.text}</p>
        </div>
        <p className={styles.arrival}>{station.next.arrival}</p>
      </article>
    </Frame>
  );
}

/* ---------- Служебный конец (станции 2 пока нет) ---------- */

function DoneScreen({ station, pages, onRestart }: { station: Station; pages: number[]; onRestart: () => void }) {
  return (
    <Frame
      station={station}
      title="Конец станции"
      footer={<NextButton onClick={onRestart} label="↺ Начать заново" />}
    >
      <div className={styles.walkCard}>
        <p>Служебный экран: станция {station.number} пройдена. Станции 2 пока нет.</p>
        <p>Собрано страниц журнала: {pages.length}.</p>
      </div>
    </Frame>
  );
}
