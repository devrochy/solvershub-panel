/**
 * Agent OS por negocio en el panel del master (HU-AOS-15).
 *
 * Dos banderas por negocio (ADR-0112, ADR-0138): procedimientos y enrutamiento (`off` | `shadow` |
 * `active`). El motor ya no es bandera: todo negocio corre en el Agent OS (ADR-0191, HU-AOS-69).
 * Las notas del runbook son avisos, no bloqueos.
 */

export type Ruteo = "off" | "shadow" | "active";

export interface Banderas {
  procedures: boolean;
  routing: Ruteo;
}

export const RUTEOS: readonly Ruteo[] = ["off", "shadow", "active"];

/** PLT-03: el reparto en palabras, sin «sombra». */

export const ETIQUETA_RUTEO: Record<Ruteo, string> = {
  off: "No",
  shadow: "De prueba (decide y lo registra, pero atiende el General)",
  active: "Sí (cada especialista atiende lo suyo)",
};

/** Lo mismo, corto, para el estado de la cabecera. */
export const RUTEO_CORTO: Record<Ruteo, string> = { off: "no", shadow: "de prueba", active: "sí" };

/**
 * Lo que `agent-os` acepta del navegador: valida y descarta cualquier otro campo. Reenvía
 * `runtime: "v3"` fijo mientras la API lo pida en el cuerpo; cuando la API lo quite (HU-AOS-69),
 * lo ignora.
 */
export function objetivoValido(cuerpo: unknown): (Banderas & { runtime: "v3" }) | null {
  if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) return null;
  const c = cuerpo as Record<string, unknown>;
  if (!RUTEOS.includes(c.routing as Ruteo)) return null;
  if (typeof c.procedures !== "boolean") return null;
  return { runtime: "v3", procedures: c.procedures, routing: c.routing as Ruteo };
}

export function iguales(a: Banderas, b: Banderas): boolean {
  return a.procedures === b.procedures && a.routing === b.routing;
}

export const NOTA_RUNBOOK =
  "Antes de encender los recorridos guiados, mide que el negocio responda igual 4 de 4 veces (pass^4). Deja el reparto " +
  "una semana de prueba y revisa el reporte de ruteo (`agent-core db reporte-ruteo`) antes de pasarlo a «Sí».";

/** Texto de la confirmación: qué cambia y las notas del runbook que aplican. */
export function resumenDelCambio(actual: Banderas, objetivo: Banderas): string {
  const partes: string[] = [];
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
