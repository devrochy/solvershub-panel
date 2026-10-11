/** El catálogo del kit solo existe con `PANEL_CATALOGO=1` (desarrollo y test). */
export function catalogoHabilitado(env: Record<string, string | undefined> = process.env): boolean {
  return env.PANEL_CATALOGO === "1";
}
