/**
 * Destino al que vuelve el login tras iniciar sesión (`/login?volver=/ayuda/...`).
 *
 * Solo se aceptan rutas del propio panel: empiezan con `/` y no con `//` ni `/\`, que el navegador
 * toma como otro sitio. Se descartan también `/login` (volvería al login) y `/api` (son rutas del
 * BFF, no páginas: `/api/session/cerrar` cerraría la sesión recién abierta).
 */
export const DESTINO_POR_DEFECTO = "/dashboard";

export function rutaInternaSegura(valor: string | string[] | null | undefined): string | null {
  const ruta = (Array.isArray(valor) ? valor[0] : valor)?.trim();
  if (!ruta || !ruta.startsWith("/") || ruta.startsWith("//") || ruta.includes("\\")) return null;
  if (/[\u0000-\u001f]/.test(ruta)) return null;
  const solaRuta = ruta.split(/[?#]/, 1)[0];
  if (/^\/(login|api)(\/|$)/.test(solaRuta)) return null;
  return ruta;
}

export function destinoTrasLogin(volver: string | string[] | null | undefined): string {
  return rutaInternaSegura(volver) ?? DESTINO_POR_DEFECTO;
}

/** `/login?volver=<ruta>`; sin ruta válida, `/login` a secas. */
export function rutaDeLogin(volverA: string): string {
  const ruta = rutaInternaSegura(volverA);
  return ruta ? `/login?volver=${encodeURIComponent(ruta)}` : "/login";
}
