/**
 * Prueba con una parte de los clientes (canary, HU-AOS-32): lógica pura del bloque de la prueba en
 * Versiones. Cómo va la muestra, la comparación entre la versión actual y la nueva, el veredicto y
 * por qué todavía no se puede publicar, en lenguaje claro.
 */
import type { CanaryLane, CanaryState } from "@/lib/api/types";
import { formatDate, formatLatency, formatUsd } from "@/lib/format";

/** Límites del porcentaje (iguales a la API: 1 a 50). */
export const PORCENTAJE_MIN = 1;
export const PORCENTAJE_MAX = 50;
export const PORCENTAJE_SUGERIDO = 10;

export function porcentajeValido(n: number): boolean {
  return Number.isInteger(n) && n >= PORCENTAJE_MIN && n <= PORCENTAJE_MAX;
}

/** Qué significa el porcentaje para el dueño. */
export function textoPorcentaje(percent: number): string {
  return (
    `${percent} de cada 100 conversaciones nuevas las atiende esta versión; el resto sigue con la actual. ` +
    "Cada conversación se queda con la versión que le tocó hasta que termine."
  );
}

export const TEXTO_PROBAR =
  "Si atiende peor que la actual, se retira sola y te avisamos. Cuando junte suficientes conversaciones " +
  "podrás publicarla para todos.";

export type Tono = "info" | "success" | "danger";

export interface EstadoDePrueba {
  titulo: string;
  tono: Tono;
  detalle: string;
}

const MOTIVO: Record<string, string> = {
  escalamiento: "pasa más conversaciones a una persona",
  completitud: "termina menos tareas",
};

const ADVERTENCIA: Record<string, string> = {
  costo: "Cuesta bastante más por conversación que la versión actual.",
  lentitud: "Responde bastante más lento que la versión actual.",
};

function lista(cosas: string[]): string {
  if (cosas.length <= 1) return cosas.join("");
  return `${cosas.slice(0, -1).join(", ")} y ${cosas[cosas.length - 1]}`;
}

/** El estado de la prueba como lo lee el dueño. La señal dura manda sobre el veredicto. */
export function estadoDePrueba(e: CanaryState): EstadoDePrueba {
  if (e.senal_dura.activa) {
    return {
      titulo: "Atiende mal a varios clientes",
      tono: "danger",
      detalle: "Varias respuestas de esta versión llegaron mal al cliente. Se retira sola en unos minutos.",
    };
  }
  if (e.veredicto === "peor") {
    const motivos = e.motivos.map((m) => MOTIVO[m] ?? m);
    return {
      titulo: "Va peor que la actual",
      tono: "danger",
      detalle: motivos.length
        ? `Frente a la versión actual, ${lista(motivos)}. No se puede publicar: se retira sola.`
        : "No se puede publicar: se retira sola.",
    };
  }
  if (e.veredicto === "listo") {
    return {
      titulo: "Va bien",
      tono: "success",
      detalle: "Atiende al menos igual que la versión actual. Ya puedes publicarla para todos.",
    };
  }
  return {
    titulo: "Juntando conversaciones",
    tono: "info",
    detalle: e.puede_publicar
      ? `Pasaron ${e.dias_manual} días sin juntar suficientes conversaciones: puedes publicarla igual, sin la comparación completa.`
      : "Todavía no hay suficientes conversaciones para compararla con la versión actual.",
  };
}

/** Avisos de costo y lentitud: no frenan la publicación. El de costo solo a quien ve los costos. */
export function advertenciasDePrueba(e: CanaryState): string[] {
  return e.advertencias.filter((a) => a !== "costo" || e.costos_visibles).map((a) => ADVERTENCIA[a] ?? a);
}

/** Por qué no se puede publicar todavía (`null` si se puede). */
export function motivoNoPublicar(e: CanaryState): string | null {
  switch (e.motivo_no_publicar) {
    case null:
    case undefined:
      return null;
    case "senal_dura":
      return "Varias respuestas llegaron mal al cliente: no se puede publicar.";
    case "peor":
      return "Atiende peor que la versión actual: no se puede publicar.";
    case "sin_muestra":
      return `Se podrá publicar al juntar ${e.umbral_conversaciones} conversaciones y ${e.umbral_horas} horas de prueba, o desde el ${formatDate(e.publicable_desde)} aunque no se junten.`;
    default:
      return "Todavía no se puede publicar.";
  }
}

export interface Muestra {
  conversaciones: number;
  umbralConversaciones: number;
  horas: number;
  umbralHoras: number;
  texto: string;
}

/** Cuánto lleva la muestra frente a lo que pide la comparación. */
export function muestraDePrueba(e: CanaryState): Muestra {
  const conversaciones = e.canary.conversaciones;
  const horas = Math.floor(e.horas);
  return {
    conversaciones,
    umbralConversaciones: e.umbral_conversaciones,
    horas,
    umbralHoras: e.umbral_horas,
    texto:
      `${Math.min(conversaciones, e.umbral_conversaciones)} de ${e.umbral_conversaciones} conversaciones · ` +
      `${Math.min(horas, e.umbral_horas)} de ${e.umbral_horas} horas`,
  };
}

const PCT = new Intl.NumberFormat("es-CO", { style: "percent", maximumFractionDigits: 1 });
const PP = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

export interface Fila {
  metrica: string;
  actual: string;
  nueva: string;
  /** Diferencia de la nueva frente a la actual; `null` sin datos para comparar. */
  diferencia: string | null;
  /** ¿La diferencia es a peor? (para el tono, siempre acompañado del texto). */
  peor: boolean;
}

function tasa(v: number | null | undefined): string {
  return v == null ? "—" : PCT.format(v);
}

/** Diferencia en puntos porcentuales; `menosEsMejor` decide qué lado es peor. */
function puntos(actual: number | null | undefined, nueva: number | null | undefined, menosEsMejor: boolean) {
  if (actual == null || nueva == null) return { diferencia: null, peor: false };
  const pp = (nueva - actual) * 100;
  return { diferencia: `${PP.format(pp)} pp`, peor: menosEsMejor ? pp > 0 : pp < 0 };
}

/** Diferencia relativa (costo y tiempo: menos es mejor). */
function relativa(actual: number | null | undefined, nueva: number | null | undefined) {
  if (!actual || nueva == null) return { diferencia: null, peor: false };
  const r = (nueva - actual) / actual;
  return { diferencia: `${PP.format(r * 100)} %`, peor: r > 0 };
}

/** La tabla comparativa: actual (carril estable) contra nueva (carril de prueba). */
export function filasDeComparacion(e: CanaryState): Fila[] {
  const a: CanaryLane = e.estable;
  const n: CanaryLane = e.canary;
  const filas: Fila[] = [
    {
      metrica: "Conversaciones",
      actual: String(a.conversaciones),
      nueva: String(n.conversaciones),
      diferencia: null,
      peor: false,
    },
    { metrica: "Pasan a una persona", actual: tasa(a.escalamiento), nueva: tasa(n.escalamiento), ...puntos(a.escalamiento, n.escalamiento, true) },
    { metrica: "Tareas terminadas", actual: tasa(a.completitud), nueva: tasa(n.completitud), ...puntos(a.completitud, n.completitud, false) },
  ];
  if (e.costos_visibles) {
    filas.push({
      metrica: "Costo por conversación",
      actual: a.costo_por_conversacion_usd == null ? "—" : formatUsd(a.costo_por_conversacion_usd),
      nueva: n.costo_por_conversacion_usd == null ? "—" : formatUsd(n.costo_por_conversacion_usd),
      ...relativa(a.costo_por_conversacion_usd, n.costo_por_conversacion_usd),
    });
  }
  filas.push({
    metrica: "Tiempo de respuesta (95 % de las veces)",
    actual: a.p95_ms == null ? "—" : formatLatency(a.p95_ms),
    nueva: n.p95_ms == null ? "—" : formatLatency(n.p95_ms),
    ...relativa(a.p95_ms, n.p95_ms),
  });
  return filas;
}

/** Respuestas que llegaron mal al cliente (señal dura), frente a la versión actual. */
export function textoSenalDura(e: CanaryState): string | null {
  const s = e.senal_dura;
  if (s.evaluadas === 0) return null;
  const actual = s.tasa_estable == null ? "" : ` (la actual: ${tasa(s.tasa_estable)})`;
  return `Respuestas que llegaron mal al cliente: ${s.llegaron_mal} de ${s.evaluadas}${actual}.`;
}
