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
export const RUTEOS: readonly Ruteo[] = ["off", "shadow", "active"];

export const ETIQUETA_RUNTIME: Record<Runtime, string> = {
  legacy: "Legacy (motor anterior)",
  v3: "v3 (releases por conexión)",
};

export const ETIQUETA_RUTEO: Record<Ruteo, string> = {
  off: "Apagado",
  shadow: "Sombra (decide y registra, no cambia quién atiende)",
  active: "Activo (enruta entre especialistas)",
};

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
  "Runbook: mide el pass^4 del negocio antes de encender los procedimientos; deja el enrutamiento una " +
  "semana en sombra y revisa `agent-core db reporte-ruteo` antes de pasarlo a activo.";

/** Texto de la confirmación: qué cambia y las notas del runbook que aplican. */
export function resumenDelCambio(actual: Banderas, objetivo: Banderas): string {
  const partes: string[] = [];
  if (actual.runtime !== objetivo.runtime) {
    partes.push(
      objetivo.runtime === "v3"
        ? "Pasa a v3: se corren los backfills del negocio y las comprobaciones de migrar-a-v3."
        : "Vuelve a legacy: se apagan también los procedimientos y el enrutamiento.",
    );
  }
  if (actual.procedures !== objetivo.procedures) {
    partes.push(
      objetivo.procedures
        ? "Enciende los procedimientos (¿mediste el pass^4?)."
        : "Apaga los procedimientos: las tareas abiertas del motor dejan de gobernarse.",
    );
  }
  if (actual.routing !== objetivo.routing) {
    partes.push(`Enrutamiento: ${ETIQUETA_RUTEO[actual.routing]} → ${ETIQUETA_RUTEO[objetivo.routing]}.`);
    if (objetivo.routing === "active" && actual.routing !== "shadow") {
      partes.push("El runbook pide una semana en sombra con reporte-ruteo antes de activo.");
    }
  }
  return partes.join(" ");
}
