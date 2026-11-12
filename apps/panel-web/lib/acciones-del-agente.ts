/**
 * Acciones del agente en el editor (fase 5a de la SPEC «habilidades por agente», ADR-0190 en
 * preparación): lógica pura de la pestaña «Acciones».
 *
 * Cada acción es un binding de `tools` del AgentSpec v3 (`ToolBindingV3`): `tool`, `enabled`,
 * `scopes`, `maxCallsPerConversation` y `requiresConfirmation`. El editor cambia solo encendido,
 * tope y confirmación, y deja el resto del binding como estaba. `buscar_conocimiento` no se controla
 * aquí: lo enciende el paso «Memoria y conocimiento» (`lib/conocimiento.ts`).
 */
import { TOOL as TOOL_CONOCIMIENTO } from "@/lib/conocimiento";

export const MAX_TOPE = 10_000;
export const TOPE_SUGERIDO = 5;

export type AccionEnEditor = {
  activo: boolean;
  /** Veces que puede usarla en una conversación; `null` = sin tope. */
  tope: number | null;
  confirmar: boolean;
  /** Se saca del agente al guardar (solo para acciones que ya no existen y bloquean publicar). */
  quitada?: boolean;
};

type Binding = Record<string, unknown> & { tool: string };

function bindings(tools: unknown): Binding[] {
  return (Array.isArray(tools) ? tools : []).filter(
    (b): b is Binding => Boolean(b) && typeof b === "object" && typeof (b as Binding).tool === "string",
  );
}

function desdeBinding(b: Binding): AccionEnEditor {
  return {
    activo: b.enabled !== false,
    tope: typeof b.maxCallsPerConversation === "number" ? b.maxCallsPerConversation : null,
    confirmar: b.requiresConfirmation === true,
  };
}

/** Acciones del borrador por nombre, sin la de conocimiento. */
export function accionesDesdeContenido(contenido: Record<string, unknown>): Record<string, AccionEnEditor> {
  const salida: Record<string, AccionEnEditor> = {};
  for (const b of bindings(contenido.tools)) {
    if (b.tool === TOOL_CONOCIMIENTO || salida[b.tool]) continue;
    salida[b.tool] = desdeBinding(b);
  }
  return salida;
}

/**
 * `tools` del borrador con los cambios del editor. Un binding sin cambios sale idéntico (no se le
 * agregan `enabled: true` ni `requiresConfirmation: false`), así que guardar otro paso no ensucia el
 * contenido. Lo que no es un binding reconocible queda donde estaba.
 */
export function aplicarAcciones(tools: unknown, acciones: Record<string, AccionEnEditor>): unknown[] {
  const lista = Array.isArray(tools) ? tools : [];
  const salida: unknown[] = [];
  for (const item of lista) {
    const b = bindings([item])[0];
    const enEditor = b ? acciones[b.tool] : undefined;
    if (!b || !enEditor || b.tool === TOOL_CONOCIMIENTO) {
      salida.push(item);
      continue;
    }
    if (enEditor.quitada) continue;
    const antes = desdeBinding(b);
    const nuevo: Binding = { ...b };
    if (enEditor.activo !== antes.activo) nuevo.enabled = enEditor.activo;
    if (enEditor.tope !== antes.tope) {
      if (enEditor.tope === null) delete nuevo.maxCallsPerConversation;
      else nuevo.maxCallsPerConversation = Math.min(Math.max(Math.round(enEditor.tope), 1), MAX_TOPE);
    }
    if (enEditor.confirmar !== antes.confirmar) {
      if (enEditor.confirmar) nuevo.requiresConfirmation = true;
      else delete nuevo.requiresConfirmation;
    }
    salida.push(nuevo);
  }
  return salida;
}

/**
 * Los errores de `tools[i]` de la API (acción que ya no existe, tope fuera de rango) usan el índice del
 * contenido guardado: se traducen al nombre de la acción para mostrarlos junto a ella.
 */
export function erroresPorAccion(errores: Record<string, string>, contenido: Record<string, unknown>): Record<string, string> {
  const lista = Array.isArray(contenido.tools) ? contenido.tools : [];
  const salida: Record<string, string> = {};
  for (const [campo, mensaje] of Object.entries(errores)) {
    const m = /^tools\[(\d+)\]/.exec(campo);
    const b = m ? bindings([lista[Number(m[1])]])[0] : undefined;
    if (b) salida[b.tool] = salida[b.tool] ? `${salida[b.tool]} ${mensaje}` : mensaje;
  }
  return salida;
}

/**
 * Errores de `tools` que no son de una acción del contenido (una acción repetida, `tools` entero o un
 * índice que ya no está): se listan arriba de la pestaña para que ninguno se pierda.
 */
export function erroresSueltosDeAcciones(errores: Record<string, string>, contenido: Record<string, unknown>): string[] {
  const lista = Array.isArray(contenido.tools) ? contenido.tools : [];
  const sueltos = Object.entries(errores).filter(([campo]) => {
    if (!/^tools\b/.test(campo)) return false;
    const m = /^tools\[(\d+)\]/.exec(campo);
    return !m || !bindings([lista[Number(m[1])]])[0];
  });
  return [...new Set(sueltos.map(([, mensaje]) => mensaje))];
}

/** Resumen corto de una acción para su fila: «Apagada», «Hasta 3 veces por conversación · Pide confirmación». */
export function resumenDeAccion(a: AccionEnEditor): string {
  if (!a.activo) return "Apagada";
  const partes = [a.tope === null ? "Sin tope" : `Hasta ${a.tope} ${a.tope === 1 ? "vez" : "veces"} por conversación`];
  if (a.confirmar) partes.push("Pide confirmación");
  return partes.join(" · ");
}
