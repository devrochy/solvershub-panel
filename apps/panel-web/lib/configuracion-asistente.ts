import type {
  CambioAsistente,
  GuionAsistente,
  OmitidoAsistente,
  OpcionConfig,
  PreguntaAsistente,
  PropuestaAsistente,
} from "@/lib/api/types";
import { etiquetaDeValor, type OpcionesPorClave } from "@/lib/catalogo-config";
import type { SeccionId } from "@/lib/configuracion-secciones";
import { franjasLegibles } from "@/lib/horario-atencion";

/**
 * Lógica pura del asistente por preguntas de Configuración (HU-CFG-11, ADR-0182). El guion, las
 * ayudas y los cálculos viven en el backend: aquí solo se ordenan los pasos, se guardan las respuestas,
 * se arman los cuerpos de la vista previa y de aplicar, y se escriben los valores para leerlos.
 * No hay listas de opciones escritas aquí: salen del guion que trae el catálogo.
 */

export type SeccionDelGuion = GuionAsistente["seccion"];

/** Qué guion del backend corresponde a cada sección del menú de Configuración. */
export const SECCION_DEL_GUION: Partial<Record<SeccionId, SeccionDelGuion>> = {
  voz: "voz",
  horario: "atencion",
};

/** `id de la pregunta` → id de la opción (preguntas de una) o ids de las opciones (preguntas de varias). */
export type Respuestas = Record<string, string | string[]>;

export type PasoDelGuion =
  | { id: string; titulo: string; pregunta: PreguntaAsistente }
  | { id: "revisar"; titulo: string };

export const ID_PASO_REVISAR = "revisar";

/**
 * El guion de la sección, o `null` si no hay (catálogo viejo, sin catálogo o sección sin asistente).
 * Un backend anterior no manda `asistente`: se lee como vacío, nunca como error.
 */
export function guionDe(
  catalogo: { asistente?: GuionAsistente[] } | null | undefined,
  seccion: SeccionId,
): GuionAsistente | null {
  const destino = SECCION_DEL_GUION[seccion];
  if (!destino) return null;
  const guion = catalogo?.asistente?.find((g) => g.seccion === destino);
  return guion && guion.preguntas.length > 0 ? guion : null;
}

/** Una pantalla por pregunta y, al final, la de revisar los cambios. */
export function pasosDelGuion(guion: GuionAsistente): PasoDelGuion[] {
  return [
    ...guion.preguntas.map<PasoDelGuion>((pregunta) => ({ id: pregunta.id, titulo: pregunta.titulo, pregunta })),
    { id: ID_PASO_REVISAR, titulo: "Revisa los cambios" },
  ];
}

export function esPasoDePregunta(paso: PasoDelGuion): paso is Extract<PasoDelGuion, { pregunta: PreguntaAsistente }> {
  return "pregunta" in paso;
}

// ------------------------------------------------------------------------------ respuestas

/** Ids elegidos en una pregunta (uno o ninguno si es de una; los marcados si es de varias). */
export function elegidasDe(respuestas: Respuestas, pregunta: PreguntaAsistente): string[] {
  const valor = respuestas[pregunta.id];
  if (valor === undefined) return [];
  return Array.isArray(valor) ? valor : [valor];
}

export function elegirUna(respuestas: Respuestas, pregunta: PreguntaAsistente, opcionId: string): Respuestas {
  return { ...respuestas, [pregunta.id]: opcionId };
}

/** Marca o desmarca una opción de una pregunta de varias; desmarcar todas deja `[]` (ninguna). */
export function alternarOpcion(
  respuestas: Respuestas,
  pregunta: PreguntaAsistente,
  opcionId: string,
  marcada: boolean,
): Respuestas {
  const actuales = elegidasDe(respuestas, pregunta).filter((id) => id !== opcionId);
  // En el orden del guion, no en el orden en que se marcaron: la huella no depende de los clics.
  const nuevas = pregunta.opciones.map((o) => o.id).filter((id) => id === opcionId ? marcada : actuales.includes(id));
  return { ...respuestas, [pregunta.id]: nuevas };
}

/** «Dejar como está»: la pregunta vuelve a no tener respuesta y no cambia nada. */
export function quitarRespuesta(respuestas: Respuestas, preguntaId: string): Respuestas {
  const { [preguntaId]: _quitada, ...resto } = respuestas; // eslint-disable-line @typescript-eslint/no-unused-vars
  return resto;
}

export function hayRespuestas(respuestas: Respuestas): boolean {
  return Object.keys(respuestas).length > 0;
}

/** Hay respuesta si se eligió una opción o si, en una de varias, se dejó explícitamente en «ninguna». */
export function estaRespondida(respuestas: Respuestas, pregunta: PreguntaAsistente): boolean {
  return pregunta.id in respuestas;
}

/**
 * Respuestas que siguen valiendo contra el guion de hoy. Sirve para lo que vuelve de localStorage o de
 * un cuerpo cualquiera: se descartan las preguntas y las opciones que ya no existen y lo mal formado.
 */
export function respuestasVigentes(crudo: unknown, guion: GuionAsistente): Respuestas {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return {};
  const salida: Respuestas = {};
  for (const pregunta of guion.preguntas) {
    const valor = (crudo as Record<string, unknown>)[pregunta.id];
    const ids = new Set(pregunta.opciones.map((o) => o.id));
    if (pregunta.tipo === "una") {
      if (typeof valor === "string" && ids.has(valor)) salida[pregunta.id] = valor;
    } else if (Array.isArray(valor) && valor.every((v) => typeof v === "string")) {
      salida[pregunta.id] = pregunta.opciones.map((o) => o.id).filter((id) => valor.includes(id));
    }
  }
  return salida;
}

/**
 * Forma de `respuestas` en el cuerpo que llega a un BFF: objeto de `string | string[]`. Devuelve
 * `null` si no lo es (el BFF responde 400); el backend valida después contra el guion.
 */
export function leerRespuestas(crudo: unknown): Respuestas | null {
  if (!crudo || typeof crudo !== "object" || Array.isArray(crudo)) return null;
  const salida: Respuestas = {};
  for (const [id, valor] of Object.entries(crudo)) {
    if (typeof valor === "string") salida[id] = valor;
    else if (Array.isArray(valor) && valor.every((v) => typeof v === "string")) salida[id] = valor as string[];
    else return null;
  }
  return salida;
}

/** Cuerpo de la vista previa: solo viajan respuestas de preguntas que el guion tiene. */
export function cuerpoDeVistaPrevia(guion: GuionAsistente, respuestas: Respuestas): { respuestas: Respuestas } {
  return { respuestas: respuestasVigentes(respuestas, guion) };
}

/** Cuerpo de aplicar: las mismas respuestas más la huella de la vista previa que se confirmó. */
export function cuerpoDeAplicar(
  guion: GuionAsistente,
  respuestas: Respuestas,
  huella: string,
): { respuestas: Respuestas; huella: string } {
  return { ...cuerpoDeVistaPrevia(guion, respuestas), huella };
}

/** Índice del paso de la pregunta a la que pertenece un error de campo de la API, o `null`. */
export function pasoDeLaPregunta(campo: string, pasos: PasoDelGuion[]): number | null {
  const i = pasos.findIndex((p) => esPasoDePregunta(p) && p.id === campo);
  return i >= 0 ? i : null;
}

// ------------------------------------------------------------------------------- retoma

/** Lo mínimo de `Storage` que usa la retoma; en pruebas se pasa uno falso. */
export type AlmacenLocal = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const PREFIJO = "configuracion-asistente:";

/** `localStorage`, o `null` si no existe o el navegador lo bloquea (ventana privada, datos bloqueados). */
export function almacenDelNavegador(): AlmacenLocal | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Avance guardado en este navegador; solo una comodidad: sin él se empieza de cero. */
export function leerAvance(
  seccion: SeccionDelGuion,
  guion: GuionAsistente,
  almacen: AlmacenLocal | null = almacenDelNavegador(),
): { respuestas: Respuestas; paso: number } | null {
  try {
    const crudo = almacen?.getItem(PREFIJO + seccion);
    if (!crudo) return null;
    const { respuestas, paso } = JSON.parse(crudo) as { respuestas?: unknown; paso?: unknown };
    const vigentes = respuestasVigentes(respuestas, guion);
    if (!hayRespuestas(vigentes)) return null;
    // Nunca se retoma en «Revisa los cambios»: la vista previa se pide de nuevo al llegar.
    const ultimaPregunta = guion.preguntas.length - 1;
    const indice = Number.isInteger(paso) ? Math.min(Math.max(paso as number, 0), ultimaPregunta) : 0;
    return { respuestas: vigentes, paso: indice };
  } catch {
    return null;
  }
}

export function guardarAvance(
  seccion: SeccionDelGuion,
  respuestas: Respuestas,
  paso: number,
  almacen: AlmacenLocal | null = almacenDelNavegador(),
): void {
  try {
    // Sin respuestas no hay nada que retomar.
    if (!hayRespuestas(respuestas)) almacen?.removeItem(PREFIJO + seccion);
    else almacen?.setItem(PREFIJO + seccion, JSON.stringify({ respuestas, paso }));
  } catch {
    /* sin almacenamiento: el asistente funciona igual, solo no retoma */
  }
}

export function olvidarAvance(seccion: SeccionDelGuion, almacen: AlmacenLocal | null = almacenDelNavegador()): void {
  try {
    almacen?.removeItem(PREFIJO + seccion);
  } catch {
    /* nada que olvidar */
  }
}

// --------------------------------------------------------------------- vista previa legible

/** Texto cuando un valor vacío significa algo concreto (el dueño no ve «vacío», ve qué pasa). */
const VACIO_SIGNIFICA: Record<string, string> = {
  out_of_hours_message: "El aviso por defecto",
};

const TOPE_DE_TEXTO = 160;

/**
 * Un valor del registro escrito para una persona: la etiqueta del catálogo en las listas cerradas, las
 * franjas como frase, las listas separadas por comas y «Sí/No» en los interruptores.
 */
export function textoDeValor(clave: string, opcion: OpcionConfig | undefined, valor: unknown): string {
  if (valor === null || valor === undefined) return "Sin definir";
  if (opcion?.tipo === "franjas") return franjasLegibles(valor);
  if (Array.isArray(valor)) {
    const textos = valor.map((v) => (typeof v === "string" ? v : JSON.stringify(v)));
    return textos.length > 0 ? textos.join(", ") : "Ninguna";
  }
  if (typeof valor === "boolean") return valor ? "Sí" : "No";
  if (opcion?.tipo === "elegir_una") {
    const posible = opcion.valores?.find((v) => v.valor === String(valor));
    return posible ? etiquetaDeValor(posible) : String(valor);
  }
  if (typeof valor === "number") return opcion?.unidad ? `${valor} ${opcion.unidad}` : String(valor);
  if (typeof valor === "string") {
    if (valor.trim() === "") return VACIO_SIGNIFICA[clave] ?? "Vacío";
    return valor.length > TOPE_DE_TEXTO ? `${valor.slice(0, TOPE_DE_TEXTO).trimEnd()}…` : valor;
  }
  return JSON.stringify(valor);
}

export interface CambioLegible {
  clave: string;
  etiqueta: string;
  actual: string;
  propuesto: string;
  /** El valor de hoy no es el que trae el sistema: lo cambió una persona antes. */
  editadoAMano: boolean;
}

/** Los cambios y los omitidos de una propuesta; el contrato los marca opcionales (vacíos por defecto). */
export function cambiosDe(propuesta: PropuestaAsistente | null | undefined): CambioAsistente[] {
  return propuesta?.cambios ?? [];
}

export function omitidosDe(propuesta: PropuestaAsistente | null | undefined): OmitidoAsistente[] {
  return propuesta?.omitidos ?? [];
}

export function describirCambio(cambio: CambioAsistente, indice: OpcionesPorClave): CambioLegible {
  const opcion = indice.get(cambio.clave);
  return {
    clave: cambio.clave,
    // La etiqueta ya viene del servidor; la del catálogo es solo el respaldo.
    etiqueta: cambio.etiqueta || opcion?.etiqueta || cambio.clave,
    actual: textoDeValor(cambio.clave, opcion, cambio.actual),
    propuesto: textoDeValor(cambio.clave, opcion, cambio.propuesto),
    editadoAMano: cambio.editado_a_mano,
  };
}

/** Los cambios de la propuesta aplicados a los valores de un formulario (solo las claves que éste tiene). */
export function conCambiosAplicados<T extends object>(valores: T, cambios: CambioAsistente[] | undefined): T {
  const siguiente = { ...valores } as Record<string, unknown>;
  for (const cambio of cambios ?? []) {
    if (cambio.clave in siguiente) siguiente[cambio.clave] = cambio.propuesto;
  }
  return siguiente as T;
}

/** Mensaje cuando la configuración cambió entre la vista previa y aplicar (409). */
export const MENSAJE_DE_VISTA_VENCIDA = "La configuración cambió mientras decidías. Revisa los cambios de nuevo.";
