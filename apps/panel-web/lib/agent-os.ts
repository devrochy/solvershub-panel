/**
 * Agent OS por negocio en el panel del master (HU-AOS-15, criterio «Orden de banderas»).
 *
 * Tres banderas por negocio (ADR-0112, ADR-0138): runtime (`legacy` | `v3`), procedimientos y
 * enrutamiento (`off` | `shadow` | `active`). Procedimientos y enrutamiento exigen v3: el panel
 * lo refleja al editar (`normalizar`) y la API lo valida igual (422). Las notas del runbook son
 * avisos, no bloqueos.
 */

export type Runtime = "legacy" | "v3";
export type Ruteo = "off" | "shadow" | "active";

export interface Banderas {
  runtime: Runtime;
  procedures: boolean;
  routing: Ruteo;
}

export const RUNTIMES: readonly Runtime[] = ["legacy", "v3"];
/**
 * Runtimes que el panel ofrece para un negocio. El Agent OS (v3) es el único motor: «legacy» solo
 * aparece mientras el negocio todavía está ahí, para poder pasarlo a v3. Volver a legacy es un
 * rollback de emergencia por consola (`agent-core db migrar-a-v3 --volver`) y la API lo rechaza.
 */
export function runtimesOfrecidos(actual: Runtime): readonly Runtime[] {
  return actual === "legacy" ? RUNTIMES : ["v3"];
}

export const RUTEOS: readonly Ruteo[] = ["off", "shadow", "active"];

/** PLT-03: el motor y el reparto en palabras, sin «legacy», «v3» ni «sombra». */
export const ETIQUETA_RUNTIME: Record<Runtime, string> = {
  legacy: "El anterior (un solo agente)",
  v3: "El nuevo (un agente por tema)",
};

export const ETIQUETA_RUTEO: Record<Ruteo, string> = {
  off: "No",
  shadow: "De prueba (decide y lo registra, pero atiende el General)",
  active: "Sí (cada especialista atiende lo suyo)",
};

/** Lo mismo, corto, para el estado de la cabecera. */
export const RUTEO_CORTO: Record<Ruteo, string> = { off: "no", shadow: "de prueba", active: "sí" };

/** Lo que `agent-os` acepta del navegador: valida y descarta cualquier otro campo. */
export function objetivoValido(cuerpo: unknown): (Banderas & { construir: boolean }) | null {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return null;
  const c = cuerpo as Record<string, unknown>;
  if (!RUNTIMES.includes(c.runtime as Runtime)) return null;
  if (!RUTEOS.includes(c.routing as Ruteo)) return null;
  if (typeof c.procedures !== "boolean") return null;
  if (c.construir !== undefined && typeof c.construir !== "boolean") return null;
  return {
    runtime: c.runtime as Runtime,
    procedures: c.procedures,
    routing: c.routing as Ruteo,
    construir: c.construir === true,
  };
}

/** Al volver a legacy se apagan procedimientos y enrutamiento (orden inverso de ADR-0112). */
export function normalizar(b: Banderas): Banderas {
  return b.runtime === "legacy" ? { runtime: "legacy", procedures: false, routing: "off" } : b;
}

export function iguales(a: Banderas, b: Banderas): boolean {
  return a.runtime === b.runtime && a.procedures === b.procedures && a.routing === b.routing;
}

export const NOTA_RUNBOOK =
  "Antes de encender los recorridos guiados, mide que el negocio responda igual 4 de 4 veces (pass^4). Deja el reparto " +
  "una semana de prueba y revisa el reporte de ruteo (`agent-core db reporte-ruteo`) antes de pasarlo a «Sí».";

/** Texto de la confirmación: qué cambia y las notas del runbook que aplican. */
export function resumenDelCambio(actual: Banderas, objetivo: Banderas): string {
  const partes: string[] = [];
  if (actual.runtime !== objetivo.runtime) {
    partes.push(
      objetivo.runtime === "v3"
        ? "Pasa al motor nuevo: se preparan los datos del negocio (backfills) y se comprueba que esté listo."
        : "Vuelve al motor anterior: se apagan también los recorridos guiados y el reparto.",
    );
  }
  if (actual.procedures !== objetivo.procedures) {
    partes.push(
      objetivo.procedures
        ? "Enciende los recorridos guiados (¿mediste que responda igual 4 de 4 veces, pass^4?)."
        : "Apaga los recorridos guiados: las tareas abiertas dejan de seguir su recorrido.",
    );
  }
  if (actual.routing !== objetivo.routing) {
    partes.push(`Reparte entre especialistas: ${RUTEO_CORTO[actual.routing]} → ${RUTEO_CORTO[objetivo.routing]}.`);
    if (objetivo.routing === "active" && actual.routing !== "shadow") {
      partes.push("Antes de «Sí» conviene una semana de prueba revisando el reporte de ruteo.");
    }
  }
  return partes.join(" ");
}
