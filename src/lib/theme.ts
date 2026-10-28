import type { CSSProperties } from "react";

/**
 * Тема оформления квеста (ТЗ платформы, раздел 12): цвета, шрифты, форма кнопок
 * и цвета героев. У каждого квеста своя тема — экраны берут оформление только отсюда.
 */
export type QuestTheme = {
  colors: {
    background: string;
    /** Фоновая «текстура» поверх цвета фона (градиенты или картинка). */
    backgroundTexture: string;
    text: string;
    muted: string;
    /** Заголовки станций. */
    heading: string;
    /** Акцент: подпись «Станция N», заполненная часть полоски плеера. */
    accent: string;
    primary: string;
    primaryText: string;
    surface: string;
    /** Рамки карточек и полей ввода. */
    border: string;
    track: string;
    inputBackground: string;
  };
  fonts: {
    /** Заголовки и подписи (всегда капсом). */
    heading: string;
    /** Основной текст и кнопки. */
    body: string;
  };
  shape: {
    radius: string;
    buttonRadius: string;
    shadow: string;
  };
  /** Герои квеста: имя и свой цвет (имя в реплике и полоска слева на карточке). */
  heroes: Record<string, { name: string; color: string }>;
};

/** Превращает тему в CSS-переменные, которые используют стили экранов. */
export function themeVariables(theme: QuestTheme): CSSProperties {
  const { colors, fonts, shape } = theme;
  return {
    "--bg": colors.background,
    "--bg-texture": colors.backgroundTexture,
    "--text": colors.text,
    "--muted": colors.muted,
    "--heading": colors.heading,
    "--accent": colors.accent,
    "--primary": colors.primary,
    "--primary-text": colors.primaryText,
    "--surface": colors.surface,
    "--border": colors.border,
    "--track": colors.track,
    "--input-bg": colors.inputBackground,
    "--heading-font": fonts.heading,
    "--body-font": fonts.body,
    "--radius": shape.radius,
    "--button-radius": shape.buttonRadius,
    "--shadow": shape.shadow,
  } as CSSProperties;
}

/** CSS-переменная с цветом героя — для карточки его реплики. */
export function heroVariables(theme: QuestTheme, hero: string): CSSProperties {
  return { "--hero-color": theme.heroes[hero]?.color ?? theme.colors.text } as CSSProperties;
}
