import { ranuraDeColor, type SerieBase } from "@/components/dataviz/escalas";

/**
 * Clases de color de cada ranura de datos (tokens `--sh-data-*`, validados en claro y
 * oscuro). Van escritas completas para que Tailwind las encuentre. Solo pintan marcas
 * (trazo, relleno, muestra de leyenda): el texto usa siempre tokens de texto.
 */
const TRAZO = ["stroke-data-1", "stroke-data-2", "stroke-data-3", "stroke-data-4"] as const;
const RELLENO = ["fill-data-1", "fill-data-2", "fill-data-3", "fill-data-4"] as const;
const FONDO = ["bg-data-1", "bg-data-2", "bg-data-3", "bg-data-4"] as const;

export type ClasesDeSerie = { trazo: string; relleno: string; fondo: string };

const UNICA: ClasesDeSerie = { trazo: "stroke-data-single", relleno: "fill-data-single", fondo: "bg-data-single" };
// «Otros» y cualquier key sin declarar van en el neutro de los ejes (recesivo, nunca un 5.º color).
const NEUTRO: ClasesDeSerie = { trazo: "stroke-data-axis", relleno: "fill-data-axis", fondo: "bg-data-axis" };

/** Clases de la serie `key` según su posición en la lista declarada (color por entidad). */
export function clasesDeSerie(key: string, declaradas: readonly SerieBase[]): ClasesDeSerie {
  const ranura = ranuraDeColor(key, declaradas);
  if (ranura === "unica") return UNICA;
  if (ranura === "otros" || ranura < 0) return NEUTRO;
  return { trazo: TRAZO[ranura], relleno: RELLENO[ranura], fondo: FONDO[ranura] };
}

export { UNICA as CLASES_SERIE_UNICA };
