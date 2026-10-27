/**
 * Interruptor «Plantillas con opciones» por negocio (SPEC-40, ADR-0172, PR 10b).
 *
 * La bandera `opciones_directas.habilitada` nace apagada en cada negocio y solo la fija el master
 * (`GET|PUT /admin/platform/tenants/{id}/opciones-directas`). Aquí vive lo que no es de pantalla:
 * el cuerpo válido del BFF, los textos de las confirmaciones, el mensaje de cada error y el enlace
 * que lleva al interruptor desde el estado vacío del editor. Los textos están en lenguaje del dueño.
 */
import type { Me } from "@/lib/api/types";

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lo que el BFF acepta del navegador: exactamente `{habilitada: boolean}` (la API rechaza lo demás). */
export function cuerpoValido(cuerpo: unknown): { habilitada: boolean } | null {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return null;
  const c = cuerpo as Record<string, unknown>;
  if (Object.keys(c).length !== 1 || typeof c.habilitada !== "boolean") return null;
  return { habilitada: c.habilitada };
}

/** Solo el admin de plataforma (no el tester, el dueño ni un colaborador) ve y opera el interruptor. */
export function esMasterDePlataforma(me: Pick<Me, "role">): boolean {
  return me.role === "master";
}

export const TITULO = "Plantillas con opciones";
export const DESCRIPCION =
  "Mensajes con botones que ejecutan una acción cuando el cliente los toca. Apagado de fábrica en cada negocio.";

export const ESTADO = { encendida: "Encendidas", apagada: "Apagadas" } as const;

/** Qué se confirma al encender: qué habilita, la restricción de prueba y cómo se apaga. */
export function confirmarEncender(negocio: string) {
  return {
    title: `¿Encender las plantillas con opciones en ${negocio}?`,
    description:
      "Esto habilita en este negocio: el editor de plantillas con opciones, la herramienta de envío para los agentes del " +
      "negocio y que los toques en los botones ejecuten acciones sin pasar por el asistente (sin LLM). " +
      "Enciéndelas solo en negocios de prueba hasta cerrar la prueba real de Meta. " +
      "Para apagarlas, vuelve a este interruptor: es inmediato y no hay nada que limpiar.",
    confirmLabel: "Encender",
    destructive: false,
  };
}

/** Apagar es más liviano: avisa qué deja de pasar. */
export function confirmarApagar(negocio: string) {
  return {
    title: `¿Apagar las plantillas con opciones en ${negocio}?`,
    description:
      "Los botones que ya se enviaron dejan de ejecutar su acción cuando el cliente los toca, y el editor vuelve a " +
      "mostrar «no activada». Las plantillas guardadas se conservan.",
    confirmLabel: "Apagar",
    destructive: false,
  };
}

export function avisoDeExito(habilitada: boolean, negocio: string): string {
  return habilitada
    ? `Plantillas con opciones encendidas en ${negocio}.`
    : `Plantillas con opciones apagadas en ${negocio}.`;
}

/** Mensaje de un error de la API para el master, sin lenguaje técnico. `0` = no hubo respuesta. */
export function mensajeDeError(status: number): string {
  if (status === 401) return "Tu sesión terminó. Vuelve a iniciar sesión.";
  if (status === 403) return "No tienes permiso para esto: solo el admin de plataforma puede encender o apagar las plantillas con opciones.";
  if (status === 404) return "No encontramos este negocio. Puede que ya se haya eliminado: actualiza la lista de tenants.";
  return "No se pudo contactar el servidor. Revisa tu conexión y vuelve a intentarlo.";
}

/** Los errores que reintentar no arregla (permiso, negocio inexistente, sesión). */
export function esReintentable(status: number): boolean {
  return status !== 401 && status !== 403 && status !== 404;
}

/**
 * Enlace del estado vacío del editor al interruptor del negocio actual (solo master). Abre Tenants
 * filtrado por el nombre del negocio y con su diálogo de acciones abierto. `null` para el resto.
 */
export function enlaceAlInterruptor(me: Pick<Me, "role" | "tenant">): string | null {
  if (!esMasterDePlataforma(me) || !me.tenant) return null;
  const qs = new URLSearchParams();
  if (me.tenant.name) qs.set("q", me.tenant.name);
  qs.set("abrir", me.tenant.id);
  return `/tenants?${qs.toString()}`;
}
