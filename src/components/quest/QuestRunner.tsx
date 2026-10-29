"use client";

import { Fragment, useState, type ReactNode } from "react";
import type { QuestTheme } from "@/lib/theme";
import { heroVariables, themeVariables } from "@/lib/theme";
import { questImage } from "@/quests/kronstadt-walk/images";
import type {
  AudioStep,
  Clip,
  CrewStep,
  Header,
  MemoStep,
  Part,
  Point,
  TaskStep,
  VoteStep,
  WalkStep,
} from "@/quests/types";
import BackArrow from "./BackArrow";
import HeroLine from "./HeroLine";
import Icon from "./Icon";
import ImageViewer from "./ImageViewer";
import { estimate, formatTime, useClipPlayer, visualAt, type ClipPlayer } from "./useClipPlayer";
import styles from "./quest.module.css";

type Props = {
  /** Части квеста по порядку: старт, станция 1, станция 2… */
  parts: Part[];
  /** С какой части начинать (служебные страницы начинают с разных). */
  startPart?: number;
  theme: QuestTheme;
  /** Папка квеста в public, например /quests/kronstadt-walk/ */
  baseUrl: string;
  /** Класс шрифта заголовков (next/font). */
  fontClass: string;
  /** Служебная кнопка «Начать заново» (только на /dev-страницах). */
  devRestart?: boolean;
};

/** Экран квеста. Подсказка и «Есть страница!» — отдельные экраны своего шага. */
type Screen =
  | { kind: "step"; p: number; i: number }
  | { kind: "hint"; p: number; i: number; n: number }
  | { kind: "found"; p: number; i: number }
  | { kind: "end" };

/** Состояние задания: подсказки, неверные варианты, решено ли (номер ответа). */
type TaskState = {
  hints: number;
  wrong: number[];
  shake: number | null;
  /** Сколько раз трясли поле ввода — чтобы анимация запускалась заново. */
  shakes: number;
  solved: number | null;
  input: string;
};

const freshTask: TaskState = { hints: 0, wrong: [], shake: null, shakes: 0, solved: null, input: "" };

/** Проверка введённого ответа (ТЗ станций): без пробелов по краям, без регистра, «ё» = «е». */
const normalize = (s: string) => s.trim().toLowerCase().replaceAll("ё", "е");

const MAP_HINT = "Нажмите на карту — откроется маршрут";

export default function QuestRunner({ parts, startPart = 0, theme, baseUrl, fontClass, devRestart }: Props) {
  const first: Screen = { kind: "step", p: startPart, i: 0 };
  const player = useClipPlayer(baseUrl);
  // История экранов: «Назад» возвращает на предыдущий, прогресс при этом не сбрасывается.
  const [history, setHistory] = useState<Screen[]>([first]);
  const [tasks, setTasks] = useState<Record<string, TaskState>>({});
  const [pages, setPages] = useState<number[]>([]);
  // Имена экипажа для грамоты.
  const [crew, setCrew] = useState<string[]>([""]);
  // Подпись под мини-картой — только на первом экране с картой во всём квесте.
  // Если квест начинается прямо с экрана с картой — подпись на нём.
  const mapAt = (p: number, i: number) => {
    const step = parts[p].steps[i];
    return step.type === "walk" && step.point ? `${p}:${i}` : null;
  };
  const [firstMap, setFirstMap] = useState<string | null>(() => mapAt(startPart, 0));
  // Картинка, открытая на весь экран (звук и экран под ней не трогаем).
  const [viewer, setViewer] = useState<ReactNode>(null);

  const screen = history[history.length - 1];
  const key = (p: number, i: number) => `${p}:${i}`;
  const taskOf = (p: number, i: number) => tasks[key(p, i)] ?? freshTask;
  const setTask = (p: number, i: number, change: (t: TaskState) => TaskState) =>
    setTasks((all) => ({ ...all, [key(p, i)]: change(all[key(p, i)] ?? freshTask) }));

  const go = (next: Screen, keepAudio = false) => {
    if (!keepAudio) player.stop();
    if (next.kind === "step" && !firstMap) setFirstMap(mapAt(next.p, next.i));
    setHistory((h) => [...h, next]);
  };
  const back = () => {
    player.stop();
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  };
  /** Следующий шаг: в этой части, иначе начало следующей части, иначе служебный конец. */
  const after = (p: number, i: number): Screen =>
    i + 1 < parts[p].steps.length
      ? { kind: "step", p, i: i + 1 }
      : p + 1 < parts.length
        ? { kind: "step", p: p + 1, i: 0 }
        : { kind: "end" };

  const restart = () => {
    player.stop();
    setHistory([first]);
    setTasks({});
    setPages([]);
    setCrew([""]);
    setFirstMap(mapAt(startPart, 0));
  };

  const onBack = history.length > 1 ? back : undefined;
  const zoomImage = (id: string) => {
    const image = questImage(id);
    setViewer(
      // eslint-disable-next-line @next/next/no-img-element -- полноэкранный просмотр
      <img src={image.src} width={image.width} height={image.height} alt="" className={styles.viewerImage} />,
    );
  };

  let content: ReactNode = null;

  if (screen.kind === "end") {
    content = (
      <Frame
        header={{ kicker: "Служебный экран", title: "Конец" }}
        onBack={onBack}
        footer={<NextButton onClick={restart} label="Начать заново" />}
      >
        <div className={styles.walkCard}>
          <p>Мини-станция «Дерево желаний» — в следующем ТЗ.</p>
          <p>Собрано страниц журнала: {pages.length}.</p>
          <p>Экипаж: {crew.filter((n) => n.trim()).join(", ") || "—"}.</p>
        </div>
      </Frame>
    );
  } else {
    const { p, i } = screen;
    const part = parts[p];
    const step = part.steps[i];
    const frame = { header: step.header ?? part.header, align: step.headerAlign, onBack };
    const next = () => go(after(p, i));

    if ((step.type === "task" || step.type === "vote") && screen.kind === "found") {
      // Ответ героя — обычный экран: шапка справа (даже если на самом задании она слева)
      content = (
        <Frame {...frame} align="right" footer={<NextButton onClick={next} />}>
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
    } else if (step.type === "task") {
      const task = taskOf(p, i);
      const solve = (answer: number, input = task.input) => {
        // Звук после ответа запускаем прямо в нажатии — иначе iPhone его не включит.
        player.start([step.afterAnswer]);
        const page = step.givesPage;
        if (page) setPages((all) => (all.includes(page) ? all : [...all, page]));
        setTask(p, i, (t) => ({ ...t, solved: answer, shake: null, input }));
        setTimeout(() => go({ kind: "found", p, i }, true), 900);
      };
      content = (
        <TaskScreen
          {...frame}
          step={step}
          state={task}
          onChoose={(choice) => {
            if (step.kind !== "choice" || task.solved !== null || task.wrong.includes(choice)) return;
            if (choice === step.correct) solve(choice);
            else setTask(p, i, (t) => ({ ...t, wrong: [...t.wrong, choice], shake: choice }));
          }}
          onInput={(value) => setTask(p, i, (t) => ({ ...t, input: value, shake: null }))}
          onCheck={() => {
            if (step.kind !== "number" || task.solved !== null || !task.input.trim()) return;
            const ok = step.accepted.some((a) => normalize(a) === normalize(task.input));
            if (ok) solve(0);
            else setTask(p, i, (t) => ({ ...t, shake: 0, shakes: t.shakes + 1 }));
          }}
          onHint={() => {
            const n = task.hints + 1;
            setTask(p, i, (t) => ({ ...t, hints: n, shake: null }));
            go({ kind: "hint", p, i, n });
          }}
          onReveal={() => (step.kind === "choice" ? solve(step.correct) : solve(0, step.accepted[0]))}
          onSolvedNext={() => go({ kind: "found", p, i })}
        />
      );
    } else if (step.type === "vote") {
      const vote = taskOf(p, i);
      content = (
        <VoteScreen
          {...frame}
          step={step}
          theme={theme}
          chosen={vote.solved}
          onChoose={(choice) => {
            if (vote.solved !== null) return;
            player.start([step.afterAnswer]);
            setTask(p, i, (t) => ({ ...t, solved: choice }));
            setTimeout(() => go({ kind: "found", p, i }, true), 900);
          }}
          onSolvedNext={() => go({ kind: "found", p, i })}
        />
      );
    } else if (step.type === "audio") {
      content = (
        <ListenScreen
          key={key(p, i)}
          {...frame}
          step={step}
          landmark={step.landmark === undefined ? part.landmark : step.landmark}
          theme={theme}
          player={player}
          onZoom={zoomImage}
          onNext={next}
        />
      );
    } else if (step.type === "walk") {
      content = (
        <WalkScreen
          {...frame}
          step={step}
          showMapHint={firstMap === key(p, i)}
          onNext={next}
        />
      );
    } else if (step.type === "crew") {
      content = <CrewScreen {...frame} step={step} crew={crew} onChange={setCrew} onZoom={zoomImage} onNext={next} />;
    } else if (step.type === "memo") {
      content = <MemoScreen {...frame} step={step} onNext={next} />;
    } else if (step.type === "journalPage") {
      const page = (
        <>
          <p className={styles.journalTitle}>
            <span className={styles.nowrap}>Страница журнала</span>{" "}
            <span className={styles.nowrap}>№{step.page}</span>
          </p>
          <p className={styles.journalText}>{step.text}</p>
        </>
      );
      const background = { backgroundImage: `url(${questImage("J2").src})` };
      const zoom = () => setViewer(<article className={styles.journal} style={background}>{page}</article>);
      content = (
        <Frame {...frame} footer={<NextButton onClick={next} />}>
          {/* Нажатие открывает страницу на весь экран; прокрутка внутри при этом работает */}
          <article
            className={`${styles.journal} ${styles.zoomable}`}
            style={background}
            role="button"
            tabIndex={0}
            aria-label="Открыть страницу журнала на весь экран"
            onClick={zoom}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && zoom()}
          >
            {page}
          </article>
        </Frame>
      );
    } else if (step.type === "tip") {
      content = (
        <Frame {...frame} footer={<NextButton onClick={next} />}>
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
      {viewer && <ImageViewer onClose={() => setViewer(null)}>{viewer}</ImageViewer>}
    </div>
  );
}

/* ---------- Общая рамка экрана: «Назад», шапка, содержимое и сразу под ним кнопка ---------- */

function Frame({
  header,
  align = "right",
  onBack,
  footer,
  children,
}: {
  header: Header;
  /** Шапка справа (обычно) или слева рядом со стрелкой — когда справа стоит герой. */
  align?: "left" | "right";
  onBack?: () => void;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className={styles.screen}>
      {/* Зигзаг: стрелка «Назад» слева → заголовки справа → герой слева */}
      <div className={styles.headRow}>
        {onBack && (
          <button type="button" className={styles.backButton} onClick={onBack} aria-label="Назад">
            <BackArrow />
          </button>
        )}
        {/* Отступ под стрелку нужен только тексту, который стоит на её линии */}
        <header
          className={[
            styles.head,
            onBack && (!header.kicker || align === "left") ? styles.headWithBack : "",
            align === "left" ? styles.headLeft : "",
          ].join(" ")}
        >
          {header.kicker && <p className={styles.kicker}>{header.kicker}</p>}
          <h1 className={styles.title}>{header.title}</h1>
        </header>
      </div>
      <div className={styles.content}>{children}</div>
      {footer && <div className={styles.actions}>{footer}</div>}
    </main>
  );
}

function NextButton({
  onClick,
  label = "Далее",
  disabled,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`${styles.button} ${styles.primary} ${styles.wide}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

/** Текст с выделением **жирным**, как в ТЗ. */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((piece, n) => (n % 2 ? <strong key={n}>{piece}</strong> : <Fragment key={n}>{piece}</Fragment>))}
    </>
  );
}

/* ---------- Экран «Слушать» (макет 1) ---------- */

function ListenScreen({
  header,
  onBack,
  step,
  landmark,
  theme,
  player,
  onZoom,
  onNext,
}: {
  header: Header;
  onBack?: () => void;
  step: AudioStep;
  landmark?: string | null;
  theme: QuestTheme;
  player: ClipPlayer;
  onZoom: (imageId: string) => void;
  onNext: () => void;
}) {
  const [readOpen, setReadOpen] = useState(false);
  const mine = player.clips[0]?.id === step.clips[0].id;
  const status = mine ? player.status : "idle";
  const clip: Clip = (mine && player.clip) || step.clips[0];
  const visual = visualAt(
    clip,
    mine ? player.clipTime : 0,
    mine ? player.clipDuration : 1,
    theme.heroes[clip.speaker]?.defaultImage ?? "F1",
  );
  const image = questImage(visual.image);
  // Герой справа смотрит влево, к центру: исходники героев смотрят вправо — отражаем
  // (кроме картинок с надписями).
  const right = image.hero && visual.side === "right";
  const mirror = right ? !image.mirror && !image.hasText : image.mirror;
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
    <Frame header={header} onBack={onBack} footer={<NextButton onClick={onNext} />}>
      {landmark && (
        <p className={styles.landmark}>
          <Icon name="compass" size={24} className={styles.landmarkIcon} />
          <span>{landmark}</span>
        </p>
      )}
      <div className={`${styles.stage} ${image.hero ? (right ? styles.stageRight : styles.stageLeft) : ""}`}>
        {image.zoomable ? (
          <button
            key={image.id}
            type="button"
            className={styles.zoomButton}
            aria-label="Открыть картинку на весь экран"
            onClick={() => onZoom(image.id)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- картинка меняется по ходу аудио */}
            <img src={image.src} width={image.width} height={image.height} alt="" className={styles.stageIllustration} />
          </button>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- картинка меняется по ходу аудио
          <img
            key={image.id}
            src={image.src}
            width={image.width}
            height={image.height}
            alt=""
            className={`${image.hero ? styles.stageHero : styles.stageIllustration} ${mirror ? styles.mirror : ""}`}
          />
        )}
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
          {clips
            .flatMap((clip) => clip.script ?? [{ speaker: clip.speaker, paragraphs: clip.paragraphs }])
            .map((line, n) => (
              <section key={n} className={styles.sheetClip} style={heroVariables(theme, line.speaker)}>
                <p className={styles.heroName}>{theme.heroes[line.speaker]?.name}</p>
                {line.paragraphs.map((p) => (
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

/* ---------- Задание: выбор варианта или ввод числа ---------- */

function TaskScreen({
  header,
  onBack,
  step,
  state,
  onChoose,
  onInput,
  onCheck,
  onHint,
  onReveal,
  onSolvedNext,
}: {
  header: Header;
  onBack?: () => void;
  step: TaskStep;
  state: TaskState;
  onChoose: (i: number) => void;
  onInput: (value: string) => void;
  onCheck: () => void;
  onHint: () => void;
  onReveal: () => void;
  onSolvedNext: () => void;
}) {
  const solved = state.solved !== null;
  const allHints = state.hints >= step.hints.length;
  const footer = solved ? (
    <NextButton onClick={onSolvedNext} />
  ) : allHints ? (
    <NextButton onClick={onReveal} label="Узнать ответ" />
  ) : (
    <button type="button" className={`${styles.button} ${styles.secondary} ${styles.wide}`} onClick={onHint}>
      <Icon name="hint" size={24} /> Подсказка
    </button>
  );

  return (
    <Frame header={header} onBack={onBack} footer={footer}>
      <div className={styles.taskCard}>
        {step.kind === "choice" ? (
          <>
            <p className={styles.question}>{step.question}</p>
            <div className={styles.options}>
              {step.options.map((option, i) => {
                const wrong = state.wrong.includes(i);
                return (
                  <button
                    key={`${option}-${wrong}-${state.shake === i}`}
                    type="button"
                    className={[
                      styles.option,
                      wrong ? styles.optionWrong : "",
                      state.shake === i ? styles.shake : "",
                      state.solved === i ? styles.optionRight : "",
                    ].join(" ")}
                    disabled={wrong || solved}
                    onClick={() => onChoose(i)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          // Вопрос, поле и «Проверить» — вместе, чтобы оставались видны над клавиатурой
          <form
            className={styles.answerForm}
            onSubmit={(e) => {
              e.preventDefault();
              onCheck();
            }}
          >
            <label htmlFor="answer" className={styles.question}>
              {step.question}
            </label>
            <input
              key={state.shakes}
              id="answer"
              className={`${styles.answerInput} ${state.shake !== null ? styles.shake : ""} ${solved ? styles.answerRight : ""}`}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={state.input}
              disabled={solved}
              // Поле только для цифр; длину режем сами — после того, как убрали пробелы и буквы
              onChange={(e) => onInput(e.target.value.replace(/\D/g, "").slice(0, step.maxLength))}
            />
            {!solved && (
              <button type="submit" className={`${styles.button} ${styles.primary} ${styles.wide}`}>
                Проверить
              </button>
            )}
          </form>
        )}
        <p className={styles.feedback} aria-live="polite">
          {state.shake !== null ? "Не совсем. Попробуйте ещё!" : ""}
        </p>
      </div>
    </Frame>
  );
}

/* ---------- «Правда или легенда?» ---------- */

function VoteScreen({
  header,
  align,
  onBack,
  step,
  theme,
  chosen,
  onChoose,
  onSolvedNext,
}: {
  header: Header;
  align?: "left" | "right";
  onBack?: () => void;
  step: VoteStep;
  theme: QuestTheme;
  chosen: number | null;
  onChoose: (i: number) => void;
  onSolvedNext: () => void;
}) {
  const answered = chosen !== null;
  return (
    <Frame header={header} align={align} onBack={onBack} footer={answered ? <NextButton onClick={onSolvedNext} /> : null}>
      <HeroLine
        theme={theme}
        hero={step.hero}
        image={step.image}
        side={step.heroSide}
        scale={step.heroScale}
        label={step.label}
        text={step.text}
      >
        <div className={styles.voteButtons}>
          {step.options.map((option, i) => (
            <button
              key={option}
              type="button"
              className={[
                styles.option,
                styles.voteOption,
                // После любого ответа верный («Легенда») подсвечивается зелёным
                answered && i === step.correct ? styles.optionRight : "",
                answered && i !== step.correct ? styles.optionWrong : "",
              ].join(" ")}
              disabled={answered}
              onClick={() => onChoose(i)}
            >
              {option}
            </button>
          ))}
        </div>
      </HeroLine>
    </Frame>
  );
}

/* ---------- Путь: к станции или внутри станции ---------- */

function WalkScreen({
  header,
  onBack,
  step,
  showMapHint,
  onNext,
}: {
  header: Header;
  onBack?: () => void;
  step: WalkStep;
  /** Подпись под картой — только при самом первом показе карты в квесте. */
  showMapHint: boolean;
  onNext: () => void;
}) {
  return (
    <Frame header={header} onBack={onBack} footer={<NextButton onClick={onNext} label={step.button} />}>
      <article className={`${styles.walkCard} ${step.point ? styles.walkWithMap : ""}`}>
        <div className={styles.walkText}>
          {step.point && <MiniMap point={step.point} showHint={showMapHint} />}
          <p>
            <Rich text={step.text} />
          </p>
        </div>
        <p className={styles.arrival}>{step.arrival}</p>
      </article>
    </Frame>
  );
}

function MiniMap({ point, showHint }: { point: Point; showHint: boolean }) {
  const map = questImage("mini-map");
  // Пешеходный маршрут в Яндекс Картах от местоположения к точке (ТЗ платформы, раздел 11).
  const mapUrl = `https://yandex.ru/maps/?rtext=~${point.lat},${point.lon}&rtt=pd`;
  return (
    <a
      className={styles.miniMap}
      href={mapUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${point.name}: открыть маршрут в Яндекс Картах`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- маленькая картинка-ссылка */}
      <img src={map.src} width={map.width} height={map.height} alt="" className={styles.miniMapImage} />
      {showHint && <span className={styles.miniMapHint}>{MAP_HINT}</span>}
    </a>
  );
}

/* ---------- Запишите свой экипаж ---------- */

function CrewScreen({
  header,
  onBack,
  step,
  crew,
  onChange,
  onZoom,
  onNext,
}: {
  header: Header;
  onBack?: () => void;
  step: CrewStep;
  crew: string[];
  onChange: (crew: string[]) => void;
  onZoom: (imageId: string) => void;
  onNext: () => void;
}) {
  const cover = questImage(step.image);
  const hasName = crew.some((name) => name.trim());
  return (
    <Frame
      header={header}
      onBack={onBack}
      footer={<NextButton onClick={onNext} label={step.button} disabled={!hasName} />}
    >
      <button type="button" className={styles.crewCover} aria-label="Открыть картинку на весь экран" onClick={() => onZoom(cover.id)}>
        {/* eslint-disable-next-line @next/next/no-img-element -- обложка журнала */}
        <img src={cover.src} width={cover.width} height={cover.height} alt="Судовой журнал" />
      </button>
      <div className={styles.taskCard}>
        <p>{step.text}</p>
        <p className={styles.question}>{step.fieldLabel}</p>
        {crew.map((name, n) => (
          <input
            key={n}
            className={styles.nameInput}
            value={name}
            autoComplete="off"
            enterKeyHint="next"
            aria-label={`${step.fieldLabel}: участник ${n + 1}`}
            onChange={(e) => onChange(crew.map((old, k) => (k === n ? e.target.value : old)))}
          />
        ))}
        <button type="button" className={`${styles.button} ${styles.secondary}`} onClick={() => onChange([...crew, ""])}>
          {step.addLabel}
        </button>
      </div>
    </Frame>
  );
}

/* ---------- Памятка ---------- */

function MemoScreen({
  header,
  onBack,
  step,
  onNext,
}: {
  header: Header;
  onBack?: () => void;
  step: MemoStep;
  onNext: () => void;
}) {
  return (
    <Frame header={header} onBack={onBack} footer={<NextButton onClick={onNext} label={step.button} />}>
      <div className={styles.taskCard}>
        <ol className={styles.memoList}>
          {step.items.map((item) => (
            <li key={item.label} className={styles.memoItem}>
              <span className={styles.memoIcon}>
                <Icon name={item.icon} size={26} />
              </span>
              <span>
                <strong>{item.label}</strong> — {item.text}
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.memoNote}>{step.note}</p>
      </div>
    </Frame>
  );
}
