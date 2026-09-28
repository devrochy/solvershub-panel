/** Tema del panel: cookie no-secreta + resolución server-side (sin flash). */

export const THEME_COOKIE = "panel_theme";

export type ThemeName = "sh-dark" | "sh-light";

/** Oscuro por defecto (manual §10); el claro es opt-in del usuario. */
export const DEFAULT_THEME: ThemeName = "sh-dark";

export function normalizeTheme(value: string | null | undefined): ThemeName {
  return value === "sh-light" ? "sh-light" : DEFAULT_THEME;
}

export function toggleTheme(current: ThemeName): ThemeName {
  return current === "sh-dark" ? "sh-light" : "sh-dark";
}
