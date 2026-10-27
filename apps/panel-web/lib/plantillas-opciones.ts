/**
 * Plantillas con opciones que ejecutan una tool (SPEC-40, ADR-0172, HU-OPC-06): lógica pura del
 * editor. Los límites son los del lint del backend (`core/kernel/opciones/definicion.py`); el
 * backend sigue siendo quien decide, aquí solo se adelanta para que el dueño los vea mientras escribe.
 */
import { camposConError, mensajeDeValidacion } from "@/lib/api/validacion";
import type {
  Me,
  OpcionesAccionDelCatalogo,
  OpcionesDefinicion,
  OpcionesHallazgo,
  OpcionesOpcion,
  OpcionesPlantilla,
} from "@/lib/api/types";

export const MAX_OPCIONES = 10;
/** Hasta 3 opciones salen como botones; de 4 a 10, como lista (ADR-0172 §2). */
export const MAX_BOTONES = 3;
export const MAX_TITULO = 20;
export const MAX_CUERPO = 1024;
export const MAX_PIE = 60;
export const MAX_RESPUESTA = 1024;
export const MAX_RESULT_KEYS = 5;
export const MAX_TTL_HORAS = 720;

export const CODIGO_BANDERA_APAGADA = "opciones_directas_no_habilitadas";

/** Caracteres como los cuenta el backend (puntos de código), no unidades UTF-16: un emoji cuenta uno. */
export function contar(texto: string): number {
  return [...texto].length;
}

// ------------------------------------------------------------------ definición
export function opcionNueva(existentes: readonly Pick<OpcionesOpcion, "id">[]): OpcionesOpcion {
  return {
    id: idNuevo(existentes.map((o) => o.id)),
    titulo: "",
    accion: { tool: "", args_fijos: {}, args_contexto: {}, confirmar: false },
    respuesta_ok: "",
    respuesta_error: "",
    result_keys: [],
  };
}

/**
 * Id estable de una opción (`[a-z0-9_]{1,12}`): firma el botón y no cambia al editar el título. Sale del
 * mayor `opN` usado más uno, así un id borrado no se reutiliza para otra cosa en la misma plantilla.
 */
export function idNuevo(usados: readonly string[]): string {
  let mayor = 0;
  for (const id of usados) {
    const m = /^op(\d+)$/.exec(id);
    if (m) mayor = Math.max(mayor, Number(m[1]));
  }
  let n = Math.max(mayor, usados.length) + 1;
  while (usados.includes(`op${n}`)) n += 1;
  return `op${n}`;
}

export function definicionVacia(): OpcionesDefinicion {
  return { body: "", footer: null, variables: [], exclusivo: true, ttl_horas: 24, opciones: [opcionNueva([])] };
}

const RUTA_VARIABLE = /^[a-z][a-z0-9_]{0,29}(\.[a-z][a-z0-9_]{0,29}){0,3}$/;
const LLAVES = /\{([^{}]*)\}/g;

/** Rutas `{cliente.nombre}` del texto, en orden y sin repetir. */
export function variablesDelCuerpo(body: string): string[] {
  const vistas: string[] = [];
  for (const m of body.matchAll(LLAVES)) {
    if (RUTA_VARIABLE.test(m[1]) && !vistas.includes(m[1])) vistas.push(m[1]);
  }
  return vistas;
}

/** `variables` siempre sale del cuerpo: el lint exige que toda `{ruta}` usada esté declarada. */
export function sincronizarVariables(definicion: OpcionesDefinicion): OpcionesDefinicion {
  const variables = variablesDelCuerpo(definicion.body);
  const iguales =
    variables.length === (definicion.variables ?? []).length && variables.every((v, i) => v === definicion.variables?.[i]);
  return iguales ? definicion : { ...definicion, variables };
}

/** Inserta `texto` en `posicion` (o al final) y devuelve el texto nuevo y dónde queda el cursor. */
export function insertarEn(base: string, texto: string, desde?: number, hasta?: number): { valor: string; cursor: number } {
  const a = desde ?? base.length;
  const b = hasta ?? a;
  return { valor: base.slice(0, a) + texto + base.slice(b), cursor: a + texto.length };
}

/** Mueve la opción `desde` a la posición `hacia` (los demás conservan su orden). */
export function moverOpcion<T>(lista: readonly T[], desde: number, hacia: number): T[] {
  if (desde === hacia || desde < 0 || hacia < 0 || desde >= lista.length || hacia >= lista.length) return [...lista];
  const copia = [...lista];
  const [pieza] = copia.splice(desde, 1);
  copia.splice(hacia, 0, pieza);
  return copia;
}

/** Cómo saldrá el mensaje según el número de opciones. */
export function formaDelMensaje(opciones: number): "botones" | "lista" {
  return opciones <= MAX_BOTONES ? "botones" : "lista";
}

/** ¿La confirmación del cliente es obligatoria para esta acción? Entonces `confirmar` queda fijo en true. */
export function confirmacionFija(ficha: Pick<OpcionesAccionDelCatalogo, "sensible" | "confirmacion_obligatoria"> | undefined): boolean {
  return Boolean(ficha && (ficha.sensible || ficha.confirmacion_obligatoria));
}

/** Quita `nombre` de ambos mapas de argumentos: un argumento no puede ser fijo y de contexto a la vez (`arg_duplicado`). */
export function sinArgumento<T extends { args_fijos?: Record<string, unknown>; args_contexto?: Record<string, string> }>(
  accion: T,
  nombre: string,
): T {
  const fijos = { ...(accion.args_fijos ?? {}) };
  const contexto = { ...(accion.args_contexto ?? {}) };
  delete fijos[nombre];
  delete contexto[nombre];
  return { ...accion, args_fijos: fijos, args_contexto: contexto };
}

/** Quita las claves cuyo valor es nulo, vacío o NaN: no se mandan argumentos en blanco a la tool. */
export function sinVacios(valor: unknown): unknown {
  if (Array.isArray(valor)) {
    const limpio = valor.map(sinVacios).filter((v) => v !== undefined);
    return limpio.length > 0 ? limpio : undefined;
  }
  if (valor && typeof valor === "object") {
    const salida: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(valor)) {
      const limpio = sinVacios(v);
      if (limpio !== undefined) salida[k] = limpio;
    }
    return Object.keys(salida).length > 0 ? salida : undefined;
  }
  if (valor === null || valor === undefined || valor === "") return undefined;
  if (typeof valor === "number" && Number.isNaN(valor)) return undefined;
  return valor;
}

// ------------------------------------------------------------------ hallazgos
/** ¿El hallazgo apunta a `destino` o a algo que cuelga de él (`opciones[1]` incluye `opciones[1].accion.tool`)? */
export function apuntaA(path: string, destino: string): boolean {
  return path === destino || path.startsWith(`${destino}.`) || path.startsWith(`${destino}[`);
}

export function hayErrores(hallazgos: readonly OpcionesHallazgo[]): boolean {
  return hallazgos.some((h) => h.severity === "error");
}

export function ordenarHallazgos(hallazgos: readonly OpcionesHallazgo[]): OpcionesHallazgo[] {
  return [...hallazgos].sort((a, b) => Number(b.severity === "error") - Number(a.severity === "error"));
}

/** Los hallazgos de uno o varios campos (por prefijo del `path`), con los errores primero. */
export function hallazgosDe(hallazgos: readonly OpcionesHallazgo[], ...destinos: string[]): OpcionesHallazgo[] {
  return ordenarHallazgos(hallazgos.filter((h) => destinos.some((d) => apuntaA(h.path, d))));
}

/** Los que no cuelgan de ninguno de los `consumidos`: se muestran aparte para que ninguno se pierda. */
export function hallazgosSinCampo(hallazgos: readonly OpcionesHallazgo[], consumidos: readonly string[]): OpcionesHallazgo[] {
  return ordenarHallazgos(hallazgos.filter((h) => !consumidos.some((d) => apuntaA(h.path, d))));
}

export type HallazgosAgrupados = {
  cuerpo: OpcionesHallazgo[];
  pie: OpcionesHallazgo[];
  vigencia: OpcionesHallazgo[];
  variables: OpcionesHallazgo[];
  /** Sobre la lista entera (`opciones`: ninguna, demasiadas). */
  lista: OpcionesHallazgo[];
  /** Por posición de la opción (`opciones[2].…`). */
  porOpcion: Map<number, OpcionesHallazgo[]>;
  /** Lo que no es de un campo conocido (`definicion`, etc.). */
  general: OpcionesHallazgo[];
};

/** Reparte los hallazgos por la zona del editor a la que apuntan su `path`. */
export function agruparHallazgos(hallazgos: readonly OpcionesHallazgo[]): HallazgosAgrupados {
  const g: HallazgosAgrupados = {
    cuerpo: [],
    pie: [],
    vigencia: [],
    variables: [],
    lista: [],
    porOpcion: new Map(),
    general: [],
  };
  for (const h of ordenarHallazgos(hallazgos)) {
    const opcion = /^opciones\[(\d+)\]/.exec(h.path);
    if (opcion) {
      const i = Number(opcion[1]);
      g.porOpcion.set(i, [...(g.porOpcion.get(i) ?? []), h]);
    } else if (apuntaA(h.path, "body")) g.cuerpo.push(h);
    else if (apuntaA(h.path, "footer")) g.pie.push(h);
    else if (apuntaA(h.path, "ttl_horas") || apuntaA(h.path, "exclusivo")) g.vigencia.push(h);
    else if (apuntaA(h.path, "variables")) g.variables.push(h);
    else if (apuntaA(h.path, "opciones")) g.lista.push(h);
    else g.general.push(h);
  }
  return g;
}

// ------------------------------------------------------------------ errores de la API (a través del BFF)
export type ErrorDeApi = {
  status: number;
  /** Mensaje en español de la API, o uno genérico. */
  mensaje: string;
  code?: string;
  hallazgos: OpcionesHallazgo[];
  motivo?: string;
  /** Campos con error de un 422 estándar de FastAPI (`detail: [{loc, msg}]`), sin repetir. */
  campos?: string[];
};

function esObjeto(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function esHallazgo(v: unknown): v is OpcionesHallazgo {
  return (
    esObjeto(v) &&
    typeof v.path === "string" &&
    typeof v.code === "string" &&
    typeof v.mensaje === "string" &&
    (v.severity === "error" || v.severity === "warning")
  );
}

/**
 * El error que devuelve el BFF (`{error, code?, details?}`; ver `app/api/agent-editor/respuesta.ts`), el sobre
 * crudo de la API (`{error: {code, message, details}}`) o el 422 estándar de FastAPI (`{detail: [...]}`). Nunca lanza.
 */
export function leerError(status: number, cuerpo: unknown): ErrorDeApi {
  const c = esObjeto(cuerpo) ? cuerpo : {};
  const sobre = esObjeto(c.error) ? c.error : null;
  const mensaje =
    (typeof c.error === "string" && c.error) || (sobre && typeof sobre.message === "string" && sobre.message) || "";
  const code = (typeof c.code === "string" && c.code) || (sobre && typeof sobre.code === "string" && sobre.code) || undefined;
  const detalles = esObjeto(c.details) ? c.details : sobre && esObjeto(sobre.details) ? sobre.details : null;
  const hallazgos = Array.isArray(detalles?.hallazgos) ? detalles.hallazgos.filter(esHallazgo) : [];
  const motivo = typeof detalles?.motivo === "string" ? detalles.motivo : undefined;
  // 422 estándar de FastAPI: `detail` es una lista (sin sobre `error`); se dice en español qué campos revisar.
  const campos = camposConError(c.detail);
  const deValidacion = Array.isArray(c.detail) ? mensajeDeValidacion(c.detail) : "";
  return {
    status,
    mensaje: mensaje || deValidacion || "No se pudo completar la acción.",
    ...(campos.length > 0 ? { campos } : {}),
    ...(code ? { code } : {}),
    hallazgos,
    ...(motivo ? { motivo } : {}),
  };
}

export const esBanderaApagada = (e: Pick<ErrorDeApi, "status" | "code">): boolean =>
  e.status === 404 && e.code === CODIGO_BANDERA_APAGADA;

/** Un `sin_cambios` al publicar no es una falla: la versión vigente ya es igual al borrador. */
export const esSinCambios = (e: Pick<ErrorDeApi, "status" | "code">): boolean => e.status === 409 && e.code === "sin_cambios";

export const esLimiteDePlantillas = (e: Pick<ErrorDeApi, "status" | "code">): boolean =>
  e.status === 409 && e.code === "limite_de_plantillas";

const MOTIVO_SIN_PLANTILLA: Record<string, string> = {
  canal_sin_botones: "Ese canal no admite botones.",
  interactivo_fuera_de_topes: "El mensaje no cabe en un interactivo de WhatsApp.",
  version_sin_plantilla_de_meta: "Esta versión no está publicada como plantilla de Meta.",
  plantilla_no_aprobada: "La plantilla de Meta de esta versión todavía no está aprobada.",
  plantilla_de_otra_cuenta: "La plantilla de Meta es de otra cuenta de WhatsApp.",
  plantilla_distinta_de_la_version: "La plantilla de Meta no coincide con esta versión.",
};

/** Texto claro de un fallo al enviar la prueba (404, 409, 422 y 502 de la API), con qué hacer después. */
export function mensajeDeEnvio(e: ErrorDeApi): string {
  switch (e.code) {
    case "conversacion_no_encontrada":
      return "Esa conversación no existe en tu negocio. Elige otra de la lista.";
    case "not_found":
      return "La plantilla ya no existe. Vuelve a la lista y revisa que siga ahí.";
    case "no_publicada":
      return "Publica la plantilla antes de enviar una prueba: solo se envía la versión publicada.";
    case "pausada":
      return "El asistente de esa conversación está en pausa y no envía mensajes. Reactívalo y vuelve a intentar.";
    case "contexto_incompleto":
      return "Faltan datos del cliente para armar el mensaje (por ejemplo su nombre). Prueba con otra conversación.";
    case "sin_plantilla": {
      const detalle = e.motivo ? (MOTIVO_SIN_PLANTILLA[e.motivo] ?? "") : "";
      return `Pasaron más de 24 horas desde el último mensaje del cliente y no hay una plantilla de Meta aprobada para esta versión. ${detalle}`.trim();
    }
    case "no_se_pudo_enviar":
      return "No se pudo enviar el mensaje por un problema del canal. Inténtalo de nuevo en unos minutos.";
    default:
      return e.status >= 500 ? "No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos." : e.mensaje;
  }
}

/** Dónde salió la prueba, en una frase para el dueño. */
export function resumenDePrueba(r: { via: "interactivo" | "plantilla" | "texto" | null; ya_enviado: boolean; ejecucion_directa: boolean; degradado: boolean }): string {
  if (r.ya_enviado) return "Este intento ya se había enviado: no se mandó otra vez.";
  const via =
    r.via === "interactivo"
      ? "Salió como mensaje interactivo (la ventana de 24 horas del cliente está abierta). Puede tocar las opciones."
      : r.via === "plantilla"
        ? "Salió como plantilla de Meta (el cliente llevaba más de 24 horas sin escribir). Puede tocar las opciones."
        : "Salió como texto con las opciones numeradas: este canal no tiene botones y tocar una opción no ejecuta nada.";
  return r.degradado && r.via === "texto" ? `${via} Se degradó a texto.` : via;
}

// ------------------------------------------------------------------ estado de la plantilla
export type EstadoPlantilla = OpcionesPlantilla["estado"];

/** ¿Hay algo que publicar? Cambios sin publicar o aún nada publicado. */
export function sePuedePublicar(p: Pick<OpcionesPlantilla, "estado" | "tiene_borrador_sin_publicar">): boolean {
  return p.estado !== "published" || p.tiene_borrador_sin_publicar;
}

/** Clave nueva a partir de un nombre: minúsculas, números y guion bajo, hasta 40 (como `^[a-z0-9_]{1,40}$`). */
export function claveDesdeNombre(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40)
    .replace(/_+$/g, "");
}

export const CLAVE_VALIDA = /^[a-z0-9_]{1,40}$/;

/** Clave de idempotencia de un intento de prueba (8 a 64 caracteres): una por apertura del diálogo. */
export function claveDeIdempotencia(): string {
  const aleatorio =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `prueba-${aleatorio}`.slice(0, 64);
}

/**
 * Escribir (crear, guardar, publicar, retirar, enviar prueba) es del propietario o del master con la sección
 * Conexiones en escritura, como el backend (`require_owner_or_master`). El resto ve la sección en solo lectura.
 */
export function puedeEscribirOpciones(me: Pick<Me, "role" | "tenant" | "permissions">): boolean {
  return me.permissions?.connections === "write" && (me.role === "master" || me.tenant?.role === "owner");
}
