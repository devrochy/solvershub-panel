/**
 * Estación 4 · Datos para probar de la ruta (HU-UX-30, SPEC-52, tableros `E4` variante `guiada` y `E4-M-nuevo`):
 * lógica pura de la carga guiada. Qué formas de carga ofrece la API para el agente y el entorno, qué preguntas
 * tiene cada una y, para «Opciones avanzadas», cómo se arma la precarga con las columnas asignadas a mano (el CSV
 * se lee en el navegador, como la precarga de ADR-0194: la API vuelve a validar todo al confirmar).
 */
import type { EstadoDatosDePrueba, MapeoPropuesto, PlantillaImportacion, RegistroDePrueba } from "@/lib/api/types";
import type { FilaEditable } from "@/lib/carga-de-datos";
import type { TipoDeNegocio } from "@/lib/onboarding";

type AsignacionOut = MapeoPropuesto["mapeo"][number];

export type MetodoDeCarga = "ia" | "csv" | "fotos" | "despues";

/** Las preguntas posibles de la estación, en su orden. */
export type PreguntaDeCarga = "metodo" | "archivo" | "generar" | "revision" | "prueba";

/**
 * Las formas de carga que la API ofrece para este agente y este entorno, siempre con «Lo hago después» al final.
 * «Generar con IA» existe solo en test (fuera de test `datos-de-prueba` responde 404); el CSV, si el agente tiene
 * plantilla de importación (fuera de test solo la de productos de Commerce, `en_produccion`), y las fotos, si su
 * plantilla las importa.
 */
export function metodosDisponibles(
  prueba: Pick<EstadoDatosDePrueba, "disponible"> | null,
  plantilla: Pick<PlantillaImportacion, "importa_fotos"> | null,
): MetodoDeCarga[] {
  const metodos: MetodoDeCarga[] = [];
  if (prueba?.disponible) metodos.push("ia");
  if (plantilla) metodos.push("csv");
  if (plantilla?.importa_fotos) metodos.push("fotos");
  return [...metodos, "despues"];
}

/** La que viene elegida y lleva «Recomendado»: la primera que carga algo (IA, si no CSV), o «Lo hago después». */
export function metodoRecomendado(metodos: readonly MetodoDeCarga[]): MetodoDeCarga {
  return metodos[0] ?? "despues";
}

/**
 * Las preguntas de cada forma de carga. La IA escribe al generar (no hay precarga que revisar antes): genera y
 * pasa a la prueba. El CSV y las fotos suben, revisan la precarga y la confirman. «Lo hago después» es solo la
 * primera: al responderla la estación queda terminada.
 */
export function preguntasDelMetodo(metodo: MetodoDeCarga): PreguntaDeCarga[] {
  if (metodo === "despues") return ["metodo"];
  if (metodo === "ia") return ["metodo", "generar", "prueba"];
  return ["metodo", "archivo", "revision", "prueba"];
}

/** Cómo se llama lo que se carga en cada tipo: «¿Cómo le damos productos para probar?». */
export const LO_DEL_TIPO: Record<TipoDeNegocio, { uno: string; varios: string }> = {
  ventas: { uno: "producto", varios: "productos" },
  agenda: { uno: "servicio", varios: "servicios" },
  cobranza: { uno: "cliente", varios: "clientes" },
  suscripciones: { uno: "plan", varios: "planes" },
};

/** El `tipo` de los registros que se muestran en «Pruébalo con tus {…}», por tipo de agente. */
const KIND_DEL_TIPO: Record<TipoDeNegocio, string> = {
  ventas: "producto",
  agenda: "tipo",
  cobranza: "cliente",
  suscripciones: "plan",
};

/** Lo cargado que se nombra en la prueba: los productos, tipos de cita, clientes o planes (sin categorías ni cuotas). */
export function cargadosDelTipo(tipo: TipoDeNegocio, registros: readonly RegistroDePrueba[]): RegistroDePrueba[] {
  return registros.filter((r) => r.tipo === KIND_DEL_TIPO[tipo] && r.nombre.trim());
}

/** «3 productos», «1 servicio». */
export function cuantos(tipo: TipoDeNegocio, n: number): string {
  const { uno, varios } = LO_DEL_TIPO[tipo];
  return `${n} ${n === 1 ? uno : varios}`;
}

// ------------------------------------------------------------------ opciones avanzadas: columnas a mano

/**
 * Lee un CSV en el navegador para asignar sus columnas a mano. Acepta coma o punto y coma (el que más aparezca en
 * la cabecera, como «Guardar como» CSV de Excel en español), comillas dobles con comillas duplicadas adentro, saltos
 * de línea dentro de comillas y BOM. Las filas vacías se saltan.
 */
export function leerCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const cabecera = limpio.slice(0, limpio.search(/\r?\n|$/));
  const sep = (cabecera.match(/;/g)?.length ?? 0) > (cabecera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (entreComillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else celda += c;
      continue;
    }
    if (c === '"' && celda === "") entreComillas = true;
    else if (c === sep) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((x) => x.trim() !== ""));
}

/** El texto de un archivo: UTF-8 y, si trae caracteres que no lo son (CSV de Excel en Windows), Windows-1252. */
export async function textoDelArchivo(archivo: Blob): Promise<string> {
  const bytes = await archivo.arrayBuffer();
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}

/** Cabecera del archivo → columna de la plantilla (`null` = no se usa), según lo que propuso la API. */
export type AsignacionManual = Record<string, string | null>;

export function asignacionDelMapeo(mapeo: readonly Pick<AsignacionOut, "cabecera" | "columna">[]): AsignacionManual {
  return Object.fromEntries(mapeo.map((a) => [a.cabecera, a.columna]));
}

/** Las cabeceras que ni el pack ni la IA reconocieron: con ellas se abre «Asignar columnas a mano». */
export function cabecerasSinAsignar(mapeo: readonly Pick<AsignacionOut, "cabecera" | "columna">[]): string[] {
  return mapeo.filter((a) => !a.columna).map((a) => a.cabecera);
}

/**
 * Las filas de la precarga con las columnas asignadas a mano. La fila 1 es la cabecera, como en la API. Si dos
 * cabeceras van a la misma columna, gana la primera con valor. Siguen marcadas «IA» solo las columnas que la IA
 * propuso y el dueño no cambió.
 */
export function filasConAsignacion(
  tabla: readonly string[][],
  asignacion: AsignacionManual,
  mapeo: readonly Pick<AsignacionOut, "cabecera" | "columna" | "origen">[],
): FilaEditable[] {
  const [cabecera = [], ...datos] = tabla;
  const deIa = new Set(
    mapeo.filter((a) => a.origen === "ia" && a.columna && asignacion[a.cabecera] === a.columna).map((a) => a.columna as string),
  );
  return datos.map((celdas, i) => {
    const valores: Record<string, string> = {};
    cabecera.forEach((nombre, j) => {
      const columna = asignacion[nombre.trim()] ?? asignacion[nombre];
      const valor = (celdas[j] ?? "").trim();
      if (columna && !valores[columna]) valores[columna] = valor;
    });
    return { fila: i + 2, valores, inferidas: [...deIa].filter((c) => valores[c]) };
  });
}

/** Las obligatorias de la plantilla que ninguna cabecera llena con la asignación actual. */
export function obligatoriasSinColumna(plantilla: Pick<PlantillaImportacion, "columnas">, asignacion: AsignacionManual): string[] {
  const usadas = new Set(Object.values(asignacion).filter(Boolean));
  return plantilla.columnas.filter((c) => c.obligatoria && !usadas.has(c.nombre)).map((c) => c.nombre);
}

// ------------------------------------------------------------------ opciones avanzadas: costo y lo cargado

/** «Cada foto cuesta 2 créditos. Te quedan 40 este mes.» (o sin tope, o con la llave propia). */
export function textoDelCostoPorFoto(c: {
  por_foto: number;
  llave_propia: boolean;
  limite: number | null;
  usado: number;
  disponible: number | null;
}): string {
  const costo = `Cada foto cuesta ${c.por_foto} ${c.por_foto === 1 ? "crédito" : "créditos"}`;
  const llave = c.llave_propia ? " (usas tu propia llave de visión: solo se cobra el uso de la plataforma)" : "";
  if (c.limite === null) return `${costo}${llave}. Te decimos el total antes de reconocerlas.`;
  const quedan = c.disponible ?? Math.max(0, c.limite - c.usado);
  return `${costo}${llave}. Te quedan ${quedan} este mes; te decimos el total antes de reconocerlas.`;
}

/** Lo cargado se borra por origen: lo generado (`datos-de-prueba`) y lo importado (`importar-datos`). */
export function origenesCargados(registros: readonly Pick<RegistroDePrueba, "origen">[]): { generado: boolean; importado: boolean } {
  return {
    generado: registros.some((r) => r.origen === "llm" || r.origen === "plantilla"),
    importado: registros.some((r) => r.origen === "importacion"),
  };
}
