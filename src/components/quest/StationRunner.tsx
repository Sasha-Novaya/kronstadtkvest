"use client";

import { useState, type ReactNode } from "react";
import type { QuestTheme } from "@/lib/theme";
import { heroVariables, themeVariables } from "@/lib/theme";
import { questImage } from "@/quests/kronstadt-walk/images";
import type { AudioStep, ChoiceTaskStep, Clip, Station } from "@/quests/types";
import HeroLine from "./HeroLine";
import Icon from "./Icon";
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

/** Экран станции. Шаги идут по порядку; подсказка и «Есть страница!» — отдельные экраны шага. */
type Screen =
  | { kind: "step"; i: number }
  | { kind: "hint"; i: number; n: number }
  | { kind: "found"; i: number }
  | { kind: "walk" }
  | { kind: "done" };

type TaskState = { hints: number; wrong: number[]; shake: number | null; solved: number | null };

const freshTask: TaskState = { hints: 0, wrong: [], shake: null, solved: null };
const first: Screen = { kind: "step", i: 0 };

export default function StationRunner({ station, theme, baseUrl, fontClass, devRestart }: Props) {
  const player = useClipPlayer(baseUrl);
  // История экранов: «‹ Назад» возвращает на предыдущий, прогресс при этом не сбрасывается.
  const [history, setHistory] = useState<Screen[]>([first]);
  const [tasks, setTasks] = useState<Record<number, TaskState>>({});
  const [pages, setPages] = useState<number[]>([]);
  const [walkViews, setWalkViews] = useState(0);

  const screen = history[history.length - 1];
  const taskOf = (i: number) => tasks[i] ?? freshTask;
  const setTask = (i: number, change: (t: TaskState) => TaskState) =>
    setTasks((all) => ({ ...all, [i]: change(all[i] ?? freshTask) }));

  const go = (next: Screen, keepAudio = false) => {
    if (!keepAudio) player.stop();
    if (next.kind === "walk") setWalkViews((v) => v + 1);
    setHistory((h) => [...h, next]);
  };
  const back = () => {
    player.stop();
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };
  const after = (i: number): Screen =>
    i + 1 < station.steps.length ? { kind: "step", i: i + 1 } : { kind: "walk" };

  const restart = () => {
    player.stop();
    setHistory([first]);
    setTasks({});
    setPages([]);
    setWalkViews(0);
  };

  const onBack = history.length > 1 ? back : undefined;
  const frame = { station, onBack };

  let content: ReactNode = null;

  if (screen.kind === "walk") {
    content = (
      <WalkScreen station={station} onBack={onBack} showMapHint={walkViews === 1} onNext={() => go({ kind: "done" })} />
    );
  } else if (screen.kind === "done") {
    content = <DoneScreen {...frame} pages={pages} onRestart={restart} />;
  } else {
    const step = station.steps[screen.i];
    const i = screen.i;

    if (step.type === "audio") {
      content = (
        <ListenScreen key={i} {...frame} step={step} theme={theme} player={player} onNext={() => go(after(i))} />
      );
    } else if (step.type === "task" && screen.kind === "hint") {
      content = (
        <Frame {...frame} footer={<NextButton onClick={back} label="К заданию" />}>
          <HeroLine
            theme={theme}
            hero={step.hintHero}
            image={step.hintImage}
            label={
              <>
                <Icon name="hint" size={26} /> Подсказка {screen.n} из {step.hints.length}
              </>
            }
            text={step.hints[screen.n - 1]}
          />
        </Frame>
      );
    } else if (step.type === "task" && screen.kind === "found") {
      content = (
        <Frame {...frame} footer={<NextButton onClick={() => go(after(i))} />}>
          <HeroLine
            theme={theme}
            hero={step.afterAnswer.speaker}
            image={step.afterAnswer.image}
            text={step.afterAnswer.paragraphs.join("\n\n")}
          >
            <MiniPlayer player={player} clips={[step.afterAnswer]} />
          </HeroLine>
        </Frame>
      );
    } else if (step.type === "task") {
      const task = taskOf(i);
      const answer = (choice: number) => {
        // Звук после ответа запускаем прямо в нажатии — иначе iPhone его не включит.
        player.start([step.afterAnswer]);
        if (step.givesPage) setPages((p) => (p.includes(step.givesPage as number) ? p : [...p, step.givesPage as number]));
        setTask(i, (t) => ({ ...t, solved: choice, shake: null }));
        setTimeout(() => go({ kind: "found", i }, true), 900);
      };
      content = (
        <TaskScreen
          {...frame}
          step={step}
          state={task}
          onChoose={(choice) => {
            if (task.solved !== null || task.wrong.includes(choice)) return;
            if (choice === step.correct) answer(choice);
            else setTask(i, (t) => ({ ...t, wrong: [...t.wrong, choice], shake: choice }));
          }}
          onHint={() => {
            const n = task.hints + 1;
            setTask(i, (t) => ({ ...t, hints: n, shake: null }));
            go({ kind: "hint", i, n });
          }}
          onReveal={() => answer(step.correct)}
          onSolvedNext={() => go({ kind: "found", i })}
        />
      );
    } else if (step.type === "journalPage") {
      content = (
        <Frame {...frame} footer={<NextButton onClick={() => go(after(i))} />}>
          <article className={styles.journal} style={{ backgroundImage: `url(${questImage("J2").src})` }}>
            <p className={styles.journalTitle}>
              <span className={styles.nowrap}>Страница журнала</span>{" "}
              <span className={styles.nowrap}>№{step.page}</span>
            </p>
            <p className={styles.journalText}>{step.text}</p>
          </article>
        </Frame>
      );
    } else if (step.type === "tip") {
      content = (
        <Frame {...frame} footer={<NextButton onClick={() => go(after(i))} />}>
          <HeroLine theme={theme} hero={step.hero} image={step.image} label="Клуша советует" text={step.text} />
        </Frame>
      );
    }
  }

  return (
    <div className={`${styles.app} ${fontClass}`} style={themeVariables(theme)}>
      {devRestart && (
        <div className={styles.devbar}>
          <span>Служебная страница</span>
          <button type="button" className={styles.devButton} onClick={restart}>
            <Icon name="replay" size={16} /> Начать заново
          </button>
        </div>
      )}
      {content}
    </div>
  );
}

/* ---------- Общая рамка экрана: «Назад», шапка, содержимое и сразу под ним кнопка ---------- */

function Frame({
  station,
  onBack,
  kicker,
  title,
  subtitle,
  footer,
  children,
}: {
  station: Station;
  onBack?: () => void;
  /** Подпись над заголовком; по умолчанию «Станция N», null — без подписи. */
  kicker?: string | null;
  title?: string;
  subtitle?: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={styles.screen}>
      {onBack && (
        <button type="button" className={styles.backButton} onClick={onBack}>
          <Icon name="back" size={20} /> Назад
        </button>
      )}
      <header className={styles.head}>
        {kicker !== null && <p className={styles.kicker}>{kicker ?? `Станция ${station.number}`}</p>}
        <h1 className={styles.title}>{title ?? station.shortTitle}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </header>
      <div className={styles.content}>{children}</div>
      {footer && <div className={styles.actions}>{footer}</div>}
    </main>
  );
}

function NextButton({ onClick, label = "Далее" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" className={`${styles.button} ${styles.primary} ${styles.wide}`} onClick={onClick}>
      {label}
    </button>
  );
}

/* ---------- Экран «Слушать» (макет 1) ---------- */

function ListenScreen({
  station,
  onBack,
  step,
  theme,
  player,
  onNext,
}: {
  station: Station;
  onBack?: () => void;
  step: AudioStep;
  theme: QuestTheme;
  player: ClipPlayer;
  onNext: () => void;
}) {
  const [readOpen, setReadOpen] = useState(false);
  const mine = player.clips[0]?.id === step.clips[0].id;
  const status = mine ? player.status : "idle";
  const clip: Clip = (mine && player.clip) || step.clips[0];
  const imageId = visualAt(
    clip,
    mine ? player.clipTime : 0,
    mine ? player.clipDuration : 1,
    theme.heroes[clip.speaker]?.defaultImage ?? "F1",
  );
  const image = questImage(imageId);
  // До первого нажатия длительность оцениваем по тексту — чтобы сразу было видно, сколько слушать.
  const total = mine ? player.total : step.clips.reduce((sum, c) => sum + estimate(c), 0);

  const main =
    status === "playing"
      ? { icon: "pause" as const, label: "Пауза", action: player.pause }
      : status === "paused"
        ? { icon: "play" as const, label: "Продолжить", action: player.play }
        : status === "ended"
          ? { icon: "replay" as const, label: "Прослушать снова", action: player.play }
          : { icon: "play" as const, label: "Слушать", action: () => player.start(step.clips) };

  return (
    <Frame station={station} onBack={onBack} footer={<NextButton onClick={onNext} />}>
      <p className={styles.landmark}>
        <Icon name="compass" size={24} className={styles.landmarkIcon} />
        <span>{station.landmark}</span>
      </p>
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
        <button type="button" className={`${styles.button} ${styles.primary} ${styles.listen}`} onClick={main.action}>
          <Icon name={main.icon} size={26} /> {main.label}
        </button>
        <div className={styles.track}>
          <div className={styles.trackFill} style={{ width: total ? `${((mine ? player.elapsed : 0) / total) * 100}%` : "0%" }} />
        </div>
        <div className={styles.time}>
          <span>{formatTime(mine ? player.elapsed : 0)}</span>
          {mine && status !== "idle" && (
            <button type="button" className={styles.back10} onClick={player.back10}>
              <Icon name="back10" size={24} /> назад 10 с
            </button>
          )}
          <span>{formatTime(total)}</span>
        </div>
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => setReadOpen(true)}>
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
            <Icon name="close" size={20} /> Закрыть
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

/** Мини-плеер в карточке реплики (реплика после ответа играет сама; после «Назад» — по кнопке). */
function MiniPlayer({ player, clips }: { player: ClipPlayer; clips: Clip[] }) {
  const mine = player.clips[0]?.id === clips[0].id;
  const playing = mine && player.status === "playing";
  const total = mine ? player.total : clips.reduce((sum, c) => sum + estimate(c), 0);
  const onClick = playing ? player.pause : mine ? player.play : () => player.start(clips);
  return (
    <div className={styles.miniPlayer}>
      <button type="button" className={styles.miniButton} onClick={onClick} aria-label={playing ? "Пауза" : "Слушать"}>
        <Icon name={playing ? "pause" : "play"} size={24} />
      </button>
      <div className={styles.track}>
        <div className={styles.trackFill} style={{ width: total ? `${((mine ? player.elapsed : 0) / total) * 100}%` : "0%" }} />
      </div>
    </div>
  );
}

/* ---------- Задание: выбор из нескольких вариантов ---------- */

function TaskScreen({
  station,
  onBack,
  step,
  state,
  onChoose,
  onHint,
  onReveal,
  onSolvedNext,
}: {
  station: Station;
  onBack?: () => void;
  step: ChoiceTaskStep;
  state: TaskState;
  onChoose: (i: number) => void;
  onHint: () => void;
  onReveal: () => void;
  onSolvedNext: () => void;
}) {
  const allHints = state.hints >= step.hints.length;
  const footer =
    state.solved !== null ? (
      <NextButton onClick={onSolvedNext} />
    ) : allHints ? (
      <NextButton onClick={onReveal} label="Узнать ответ" />
    ) : (
      <button type="button" className={`${styles.button} ${styles.secondary} ${styles.wide}`} onClick={onHint}>
        <Icon name="hint" size={24} /> Подсказка
      </button>
    );

  return (
    <Frame station={station} onBack={onBack} footer={footer}>
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

/* ---------- Путь к следующей станции ---------- */

function WalkScreen({
  station,
  onBack,
  showMapHint,
  onNext,
}: {
  station: Station;
  onBack?: () => void;
  /** Подпись под картой — только при самом первом показе в квесте. */
  showMapHint: boolean;
  onNext: () => void;
}) {
  const { point } = station.next;
  const map = questImage("mini-map");
  // Пешеходный маршрут в Яндекс Картах от местоположения к точке (ТЗ платформы, раздел 11).
  const mapUrl = `https://yandex.ru/maps/?rtext=~${point.lat},${point.lon}&rtt=pd`;
  return (
    <Frame
      station={station}
      onBack={onBack}
      kicker={null}
      title={`Путь к станции ${station.next.stationNumber}`}
      subtitle={station.next.stationTitle}
      footer={<NextButton onClick={onNext} label={station.next.button} />}
    >
      <article className={styles.walkCard}>
        <div className={styles.walkText}>
          <a
            className={styles.miniMap}
            href={mapUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${point.name}: открыть маршрут в Яндекс Картах`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- маленькая картинка-ссылка */}
            <img src={map.src} width={map.width} height={map.height} alt="" className={styles.miniMapImage} />
            {showMapHint && <span className={styles.miniMapHint}>Нажмите, чтобы открыть маршрут</span>}
          </a>
          <p>{station.next.text}</p>
        </div>
        <p className={styles.arrival}>{station.next.arrival}</p>
      </article>
    </Frame>
  );
}

/* ---------- Служебный конец (станции 2 пока нет) ---------- */

function DoneScreen({
  station,
  onBack,
  pages,
  onRestart,
}: {
  station: Station;
  onBack?: () => void;
  pages: number[];
  onRestart: () => void;
}) {
  return (
    <Frame
      station={station}
      onBack={onBack}
      kicker="Служебный экран"
      title="Конец станции"
      footer={<NextButton onClick={onRestart} label="Начать заново" />}
    >
      <div className={styles.walkCard}>
        <p>Станция {station.number} пройдена. Станции 2 пока нет.</p>
        <p>Собрано страниц журнала: {pages.length}.</p>
      </div>
    </Frame>
  );
}
