/**
 * Tablero de embudo de leads (HU-CRM-24): una columna por etapa del lead, con su cantidad, la suma del
 * valor estimado y las 50 tarjetas más recientes. Aquí viven las partes puras (la consulta de cada
 * columna, la tarjeta y el movimiento optimista); el tablero y la ruta «Ver más» solo las usan.
 */

import type { LeadsResponse } from "@/lib/api/types";
import { filtrosDePacks, hrefFicha } from "@/lib/clientes";
import { seguimientoDeExtras } from "@/lib/seguimiento";

/** Tarjetas por columna y por «Ver más»: el máximo de la API es 100, 50 mantiene la pantalla ligera. */
export const TARJETAS_POR_COLUMNA = 50;

export type FilaDeLead = LeadsResponse["items"][number];

/** Lo que muestra una tarjeta; es serializable para pasar del servidor al tablero. */
export type TarjetaDeEmbudo = {
  id: string;
  nombre: string;
  /** Puntaje del lead (0–100), o null si aún no tiene. */
  puntaje: number | null;
  /** Valor estimado en la moneda del negocio, o null si el lead no tiene. */
  valor: number | null;
  /** Última actividad (ISO 8601). */
  actividad: string | null;
  /** Su próxima acción ya pasó. */
  vencido: boolean;
  href: string;
};

export function tarjetaDeFila(fila: FilaDeLead, agente: string): TarjetaDeEmbudo {
  const puntaje = fila.extras.puntaje;
  const valor = fila.extras.valor_estimado;
  return {
    id: fila.id,
    nombre: fila.perfil.nombre_visible,
    puntaje: typeof puntaje === "number" && Number.isFinite(puntaje) ? puntaje : null,
    valor: typeof valor === "number" && Number.isFinite(valor) ? valor : null,
    actividad: fila.ultima_actividad ?? null,
    vencido: seguimientoDeExtras(fila.extras)?.estado === "vencidos",
    href: hrefFicha(fila.id, { agente }),
  };
}

export type ColumnaDeEmbudo = {
  /** Código de la etapa (`nuevo`). */
  value: string;
  label: string;
  /** Leads de la etapa con los filtros activos (el contador de la API, no solo los cargados). */
  total: number;
  /** Suma del valor estimado de la etapa, o null si el servidor no la calcula. */
  suma: number | null;
  tarjetas: TarjetaDeEmbudo[];
  /**
   * Tarjetas que llegaron a esta columna por un movimiento en este tablero. El servidor no las tenía aquí
   * cuando se pidió la primera página, así que no cuentan para saber desde dónde seguir.
   */
  entraron: string[];
  hayMas: boolean;
  /** La columna no se pudo cargar. */
  error?: string;
};

/**
 * Query de `/admin/leads` para una columna: los mismos filtros, búsqueda y orden de la vista, la etapa de
 * la columna como filtro y la página pedida. La etapa elegida en la URL se ignora: las columnas ya son
 * las etapas.
 */
export function consultaDeColumna({
  agente,
  q,
  filtros,
  orden,
  etapa,
  valor,
  pagina = 1,
  tamano = TARJETAS_POR_COLUMNA,
}: {
  agente: string;
  q?: string;
  filtros?: string | string[];
  orden?: string | null;
  /** Clave del filtro de la etapa (`estado_lead`). */
  etapa: string;
  valor: string;
  pagina?: number;
  tamano?: number;
}): URLSearchParams {
  const qs = new URLSearchParams({ agente });
  if (q?.trim()) qs.set("q", q.trim());
  for (const f of filtrosDePacks(filtros)) if (!f.startsWith(`${etapa}:`)) qs.append("filtro", f);
  qs.append("filtro", `${etapa}:${valor}`);
  if (orden && orden !== "alta") qs.set("orden", orden);
  qs.set("page_size", String(tamano));
  if (pagina > 1) qs.set("page", String(pagina));
  return qs;
}

/**
 * Desde qué posición de la lista del servidor sigue «Ver más». La lista de la columna cambia cuando se
 * mueven tarjetas (una que sale corre las demás una posición hacia arriba), así que no sirve contar páginas:
 * se cuentan las tarjetas que la columna ya muestra, sin las que llegaron por un movimiento (a esas el
 * servidor las pudo poner en cualquier lugar; si las puso antes, «Ver más» repite alguna y se descarta).
 */
export function desdeDeColumna(columna: ColumnaDeEmbudo): number {
  return Math.max(0, columna.tarjetas.length - columna.entraron.length);
}

/**
 * Pasa una tarjeta de su columna a otra: cambia las cantidades y las sumas, y la deja arriba de la nueva
 * (es lo más reciente que se hizo). Si la tarjeta no está o ya estaba ahí, devuelve las mismas columnas.
 */
export function moverTarjeta(columnas: ColumnaDeEmbudo[], id: string, hacia: string): ColumnaDeEmbudo[] {
  const origen = columnas.find((c) => c.tarjetas.some((t) => t.id === id));
  const destino = columnas.find((c) => c.value === hacia);
  if (!origen || !destino || origen.value === destino.value) return columnas;
  const tarjeta = origen.tarjetas.find((t) => t.id === id)!;
  const monto = tarjeta.valor ?? 0;
  return columnas.map((c) => {
    if (c.value === origen.value) {
      return {
        ...c,
        total: Math.max(0, c.total - 1),
        suma: c.suma === null ? null : Math.max(0, c.suma - monto),
        tarjetas: c.tarjetas.filter((t) => t.id !== id),
        entraron: c.entraron.filter((e) => e !== id),
      };
    }
    if (c.value === destino.value) {
      return {
        ...c,
        total: c.total + 1,
        suma: c.suma === null ? null : c.suma + monto,
        tarjetas: [tarjeta, ...c.tarjetas],
        entraron: [...c.entraron, id],
      };
    }
    return c;
  });
}

/** Agrega la página siguiente de una columna sin repetir tarjetas que ya están en el tablero. */
export function sumarPagina(
  columnas: ColumnaDeEmbudo[],
  hacia: string,
  tarjetas: TarjetaDeEmbudo[],
  hayMas: boolean,
): ColumnaDeEmbudo[] {
  const vistas = new Set(columnas.flatMap((c) => c.tarjetas.map((t) => t.id)));
  const nuevas = tarjetas.filter((t) => !vistas.has(t.id));
  return columnas.map((c) => (c.value === hacia ? { ...c, tarjetas: [...c.tarjetas, ...nuevas], hayMas } : c));
}
