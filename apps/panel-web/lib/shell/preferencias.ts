/**
 * Preferencia de la barra lateral (HU-DS-04, D-SPEC-29-4). Va en una cookie que lee el
 * layout en el servidor: así la barra sale con su ancho desde el primer render, sin salto.
 *
 * - `auto` (sin cookie): plegada entre 768 y 1279 px, expandida desde 1280 px.
 * - `expandida` / `plegada`: lo que eligió el usuario, en cualquier ancho desde 768 px.
 * Debajo de 768 px el menú siempre es un cajón.
 */
export const SIDEBAR_COOKIE = "panel_sidebar";

export type ModoSidebar = "auto" | "expandida" | "plegada";

export function leerModoSidebar(valor: string | undefined | null): ModoSidebar {
  return valor === "expandida" || valor === "plegada" ? valor : "auto";
}

/** Cookie de un año, de primera parte y sin datos personales. */
export function cookieModoSidebar(modo: Exclude<ModoSidebar, "auto">): string {
  return `${SIDEBAR_COOKIE}=${modo}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * Atajos de una tecla (`?`, `/`, `[`, `g` + letra; HU-DS-05). Encendidos por defecto; se
 * apagan desde la ayuda de atajos, la paleta o Configuración → Accesibilidad (WCAG 2.1.4).
 * Ctrl/⌘ K sigue funcionando siempre: lleva modificador.
 */
export const ATAJOS_COOKIE = "panel_atajos";

export function leerAtajosActivos(valor: string | undefined | null): boolean {
  return valor !== "apagados";
}

export function cookieAtajos(activos: boolean): string {
  return `${ATAJOS_COOKIE}=${activos ? "encendidos" : "apagados"}; path=/; max-age=31536000; samesite=lax`;
}
