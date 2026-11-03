import { nivelAlcanza, type NivelAyuda } from "@/lib/ayuda/acceso";

export type PaginaAyuda = {
  /** Ruta dentro de `docs/` (`02-guia/01-x.md`). */
  ruta: string;
  /** Ruta bajo /ayuda sin barras de los extremos; la portada es `""`. */
  slug: string;
  titulo: string;
  proposito: string;
  publico: string;
  acceso: string;
  seccion: string;
  orden: number;
  /** HTML ya saneado por el script de sincronización. */
  html: string;
};

/** Lo que necesitan el menú y el índice: la página sin su HTML. */
export type EntradaDeIndice = Omit<PaginaAyuda, "html">;

export type SeccionDeIndice = { titulo: string; paginas: EntradaDeIndice[] };

export const BASE_AYUDA = "/ayuda";

export function hrefDeAyuda(slug: string): string {
  return slug ? `${BASE_AYUDA}/${slug}` : BASE_AYUDA;
}

/** Slug del catch-all de la ruta, o null si algún segmento no es una ruta de la Wiki. */
export function slugDeSegmentos(segmentos: string[] | undefined): string | null {
  if (!segmentos || segmentos.length === 0) return "";
  const limpios: string[] = [];
  for (const crudo of segmentos) {
    let s: string;
    try {
      s = decodeURIComponent(crudo);
    } catch {
      return null;
    }
    if (!s || s === "." || s === ".." || /[\\/]/.test(s)) return null;
    limpios.push(s);
  }
  return limpios.join("/");
}

/** Páginas que el nivel puede ver, sin su HTML ni nada más que el menú necesite. */
export function indiceVisible(paginas: readonly PaginaAyuda[], nivel: NivelAyuda): EntradaDeIndice[] {
  return paginas
    .filter((p) => nivelAlcanza(nivel, p.acceso))
    .map((p): EntradaDeIndice => ({
      ruta: p.ruta,
      slug: p.slug,
      titulo: p.titulo,
      proposito: p.proposito,
      publico: p.publico,
      acceso: p.acceso,
      seccion: p.seccion,
      orden: p.orden,
    }))
    .sort((a, b) => a.orden - b.orden);
}

/**
 * La página de un slug para ese nivel, o null. Una página que no existe y una que el nivel no
 * puede ver devuelven lo mismo, para que el 404 no revele que existe.
 */
export function buscarPagina(
  paginas: readonly PaginaAyuda[],
  segmentos: string[] | undefined,
  nivel: NivelAyuda,
): PaginaAyuda | null {
  const slug = slugDeSegmentos(segmentos);
  if (slug === null) return null;
  const pagina = paginas.find((p) => p.slug === slug);
  return pagina && nivelAlcanza(nivel, pagina.acceso) ? pagina : null;
}

/** Agrupa el índice por sección conservando el orden del nav; la portada queda fuera. */
export function seccionesDeIndice(entradas: readonly EntradaDeIndice[]): SeccionDeIndice[] {
  const secciones: SeccionDeIndice[] = [];
  for (const entrada of entradas) {
    if (!entrada.seccion) continue;
    let seccion = secciones.find((s) => s.titulo === entrada.seccion);
    if (!seccion) {
      seccion = { titulo: entrada.seccion, paginas: [] };
      secciones.push(seccion);
    }
    seccion.paginas.push(entrada);
  }
  return secciones;
}
