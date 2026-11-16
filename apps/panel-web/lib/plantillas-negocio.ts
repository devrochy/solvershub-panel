import type { components } from "@/lib/api/schema";

/**
 * Plantillas del negocio en todas sus conexiones de WhatsApp (HU-CONN-21): reglas puras de la matriz
 * plantilla × conexión y de la copia. Sin JSX ni fetch.
 *
 * WhatsApp aprueba cada plantilla por cuenta: la «plantilla del negocio» es su nombre e idioma, que es como los
 * avisos por evento la eligen en la conexión de cada conversación. Copiar la crea en la otra conexión y la manda a
 * aprobación; nunca pisa una que ya exista con otro texto.
 */

export type MatrizPlantillas = components["schemas"]["PlantillasNegocioMatrizOut"];
export type ConexionDePlantillas = components["schemas"]["PlantillasNegocioConexionOut"];
export type FilaDePlantilla = components["schemas"]["PlantillasNegocioFilaOut"];
export type CeldaDePlantilla = components["schemas"]["PlantillasNegocioCeldaOut"];
export type AvisoSinPlantilla = components["schemas"]["PlantillasNegocioAvisoFaltanteOut"];
export type ResultadoDeCopia = components["schemas"]["PlantillasNegocioResultadoOut"];
export type ResumenDeCopia = components["schemas"]["PlantillasNegocioResumenOut"];
export type ConexionRef = components["schemas"]["PlantillasNegocioConexionRef"];

type Tono = "success" | "warning" | "danger" | "info" | "neutral";

/** Base del BFF (`app/api/whatsapp-templates`). */
export const BFF_PLANTILLAS_NEGOCIO = "/api/whatsapp-templates";

/** Ruta del backend para lo que pide el BFF, o `null` si no está en la lista cerrada. */
export function rutaPlantillasNegocioDeBackend(metodo: string, segmentos: readonly string[]): string | null {
  const base = "/admin/whatsapp-templates";
  if (metodo === "GET" && segmentos.length === 0) return base;
  if (metodo === "POST" && segmentos.length === 1 && (segmentos[0] === "copy" || segmentos[0] === "copy-all")) {
    return `${base}/${segmentos[0]}`;
  }
  return null;
}

const ESTADOS: Record<string, { label: string; tono: Tono }> = {
  aprobada: { label: "Aprobada", tono: "success" },
  pendiente: { label: "En revisión", tono: "warning" },
  sin_enviar: { label: "Sin enviar", tono: "neutral" },
  rechazada: { label: "Rechazada", tono: "danger" },
  pausada: { label: "Pausada", tono: "warning" },
  falta: { label: "Falta", tono: "info" },
  no_replicable: { label: "No replicable", tono: "neutral" },
};

/** Estado de una plantilla en una conexión, en palabras. */
export function estadoDeCelda(estado: string): { label: string; tono: Tono } {
  return ESTADOS[estado] ?? { label: estado || "Sin estado", tono: "neutral" };
}

const RESULTADOS: Record<ResultadoDeCopia["resultado"], string> = {
  creada: "Creada y enviada a aprobación",
  ya_existia: "Ya estaba",
  distinta: "Ya existe con otro texto (no se tocó)",
  no_replicable: "No se puede copiar",
  error: "No se pudo copiar",
};

/** Resultado de la copia en un destino, en palabras. */
export function resultadoDeCopia(r: Pick<ResultadoDeCopia, "resultado" | "motivo">): string {
  const base = RESULTADOS[r.resultado] ?? r.resultado;
  return r.motivo ? `${base}: ${r.motivo}` : base;
}

/** Proveedor en palabras, para la cabecera de cada columna. */
export function proveedorLabel(proveedor: string): string {
  return proveedor === "twilio" ? "WhatsApp vía Twilio" : "WhatsApp de Meta";
}

/** Enlace a la pestaña Plantillas de la conexión (Meta va por la cuenta; Twilio por la conexión). */
export function enlaceAPlantillasDeConexion(c: Pick<ConexionDePlantillas, "proveedor" | "id">): string {
  const id = encodeURIComponent(c.id);
  return c.proveedor === "twilio" ? `/conexiones/${id}/plantillas` : `/conexiones/meta/${id}/plantillas`;
}

export function refDe(c: Pick<ConexionDePlantillas, "proveedor" | "id">): ConexionRef {
  return { proveedor: c.proveedor, id: c.id };
}

/** Conexiones donde la plantilla está aprobada: de ahí se puede copiar. */
export function origenesDe(fila: FilaDePlantilla, conexiones: readonly ConexionDePlantillas[]): ConexionDePlantillas[] {
  return conexiones.filter((c) => fila.celdas[c.clave]?.estado === "aprobada");
}

/**
 * Destinos que se ofrecen para copiar la fila: conexiones activas fuera del Sandbox donde la plantilla falta.
 * Donde ya está (o no se puede copiar) no se ofrece; el backend igual lo resolvería sin duplicar.
 */
export function destinosDe(fila: FilaDePlantilla, conexiones: readonly ConexionDePlantillas[]): ConexionDePlantillas[] {
  return conexiones.filter((c) => c.destinable && fila.celdas[c.clave]?.estado === "falta");
}

/** Conexiones con al menos una plantilla aprobada: origen posible de «Copiar todas a…». */
export function origenesDeTodas(matriz: Pick<MatrizPlantillas, "filas" | "conexiones">): ConexionDePlantillas[] {
  return matriz.conexiones.filter((c) => matriz.filas.some((f) => f.celdas[c.clave]?.estado === "aprobada"));
}

/** Resumen de «Copiar todas a…» en una frase. */
export function frasesDeResumen(r: Pick<ResumenDeCopia, "creadas" | "ya_existian" | "distintas" | "no_replicables" | "errores" | "restantes">): string {
  const partes: string[] = [];
  const n = (k: number, uno: string, varios: string) => (k === 1 ? `1 ${uno}` : `${k} ${varios}`);
  partes.push(n(r.creadas, "creada", "creadas"));
  if (r.ya_existian) partes.push(n(r.ya_existian, "ya estaba", "ya estaban"));
  if (r.distintas) partes.push(n(r.distintas, "con otro texto (no se tocó)", "con otro texto (no se tocaron)"));
  if (r.no_replicables) partes.push(n(r.no_replicables, "no se puede copiar", "no se pueden copiar"));
  if (r.errores) partes.push(n(r.errores, "falló", "fallaron"));
  if (r.restantes) partes.push(n(r.restantes, "pendiente", "pendientes"));
  return `${partes.join(", ")}.`;
}

/** Avisos agrupados por conexión, para decir por dónde no saldrán. */
export function avisosPorConexion(
  avisos: readonly AvisoSinPlantilla[],
  conexiones: readonly ConexionDePlantillas[],
): { conexion: ConexionDePlantillas; avisos: AvisoSinPlantilla[] }[] {
  return conexiones
    .map((conexion) => ({ conexion, avisos: avisos.filter((a) => a.conexion === conexion.clave) }))
    .filter((g) => g.avisos.length > 0);
}

/**
 * Suma una vuelta de «Copiar todas» a lo acumulado. Cada vuelta vuelve a mirar todo el origen: lo que se creó en
 * una vuelta anterior llega ahora como «ya estaba», así que se descuenta; distintas y no replicables son las de la
 * última vuelta (se recalculan siempre); creadas y errores se suman.
 */
export function sumarResumen(previo: ResumenDeCopia | null, vuelta: ResumenDeCopia): ResumenDeCopia {
  if (!previo) return vuelta;
  const clave = (d: Pick<ResultadoDeCopia, "nombre" | "idioma">) => `${d.nombre}/${d.idioma}`;
  const yaHechas = previo.detalle.filter((d) => d.resultado === "creada" || d.resultado === "error");
  const hechas = new Set(yaHechas.map(clave));
  const nuevas = vuelta.detalle.filter((d) => !hechas.has(clave(d)));
  return {
    creadas: previo.creadas + vuelta.creadas,
    ya_existian: nuevas.filter((d) => d.resultado === "ya_existia").length,
    distintas: vuelta.distintas,
    no_replicables: vuelta.no_replicables,
    errores: previo.errores + vuelta.errores,
    restantes: vuelta.restantes,
    detalle: [...yaHechas, ...nuevas],
  };
}
