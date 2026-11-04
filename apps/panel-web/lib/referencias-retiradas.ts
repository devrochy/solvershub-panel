/**
 * Referencias retiradas en agentes y releases (HU-AOS-59): lógica pura del aviso, solo lectura.
 *
 * Una versión de agente publicada o una release guardan nombres de acciones y procedimientos; si el
 * código retira uno, el agente sigue apuntando a algo que ya no existe. La API lo detecta y el panel
 * solo avisa (decisión del dueño, 2026-11-03): no hay botón de corregir. Los textos (`message`) llegan
 * escritos en palabras simples; `code`, `path` y `field` son localizadores técnicos que el dueño no ve.
 */
import type {
  AgentRetiredNotices,
  RetiredAsideConnection,
  RetiredNotice,
  RetiredReferenceRow,
  RetiredReferencesReport,
} from "@/lib/api/types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuid(valor: string): boolean {
  return UUID.test(valor);
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

// ------------------------------------------------------------------ master

export const ETIQUETA_APARTE: Record<RetiredAsideConnection["reason"], string> = {
  borrada: "Conexión borrada",
  playground: "Playground",
  integracion: "Integración",
};

export const AYUDA_APARTE: Record<RetiredAsideConnection["reason"], string> = {
  borrada: "La conexión ya no existe: conserva una release vieja que no importa.",
  playground: "Es de pruebas: no atiende clientes.",
  integracion: "Es una integración: no produce conversaciones de clientes.",
};

/** Titular del aviso del negocio: cuántos agentes y releases siguen nombrando algo retirado. */
export function resumenDelReporte(r: Pick<RetiredReferencesReport, "affected" | "agents_affected" | "releases_affected">): string {
  if (!r.affected) return "Ningún agente ni release nombra algo retirado.";
  return `${plural(r.agents_affected, "agente afectado", "agentes afectados")} y ${plural(r.releases_affected, "release afectada", "releases afectadas")}.`;
}

export function etiquetaDeAlcance(row: Pick<RetiredReferenceRow, "scope" | "version">): string {
  if (row.scope === "draft") return "Borrador";
  if (row.scope === "release") return "Release activa";
  return row.version === null ? "Versión publicada" : `Versión ${row.version}`;
}

export type GrupoDeAgente = { agente: string; filas: RetiredReferenceRow[] };

/** Filas agrupadas por agente (clave), en el orden en que llegan; dentro de cada grupo se conserva el orden. */
export function agruparPorAgente(filas: RetiredReferenceRow[]): GrupoDeAgente[] {
  const grupos = new Map<string, RetiredReferenceRow[]>();
  for (const fila of filas) grupos.set(fila.agent, [...(grupos.get(fila.agent) ?? []), fila]);
  return [...grupos].map(([agente, rows]) => ({ agente, filas: rows }));
}

// ------------------------------------------------------------------ dueño

export type RetiredNoticeEnCampo = Pick<RetiredNotice, "field" | "message">;

/** Dónde está la referencia, en palabras: el borrador bloquea publicar; lo demás ya está en uso. */
export function etiquetaDeAviso(scope: RetiredNotice["scope"]): string {
  if (scope === "draft") return "En tu borrador";
  if (scope === "published") return "En la última versión publicada";
  return "En lo que atiende hoy";
}

/** Titular del aviso de un agente. */
export function titularDelAgente(a: Pick<AgentRetiredNotices, "blocks_publish" | "in_use" | "notices">): string | null {
  if (a.notices.length === 0) return null;
  if (a.blocks_publish) return "Este agente nombra algo que ya no existe y no se puede publicar hasta quitarlo.";
  if (a.in_use) return "Este agente, tal como atiende hoy, nombra algo que ya no existe.";
  return "La última versión publicada de este agente nombra algo que ya no existe.";
}

/**
 * Avisos del borrador como `{campo: texto}`, con las mismas claves que los errores del editor. Solo los
 * del borrador: el índice de `procedures[i]` de una versión publicada no es el del borrador.
 */
export function avisosDelBorrador(avisos: RetiredNotice[]): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const a of avisos) {
    if (a.scope !== "draft") continue;
    salida[a.field] = salida[a.field] ? `${salida[a.field]} ${a.message}` : a.message;
  }
  return salida;
}

/**
 * Del 422 `invalid_spec` de publicar: `error.details.retired_references` como `[{field, message}]`
 * (llega en `details` del BFF). Ignora cualquier forma inesperada.
 */
export function referenciasDelError(details: unknown): RetiredNoticeEnCampo[] {
  if (!details || typeof details !== "object") return [];
  const lista = (details as { retired_references?: unknown }).retired_references;
  if (!Array.isArray(lista)) return [];
  return lista.flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const { field, message } = r as Record<string, unknown>;
    return typeof field === "string" && typeof message === "string" && message ? [{ field, message }] : [];
  });
}

/**
 * Errores de campos de acciones o playbooks (`tools[3].tool`, `playbooks[0]...`): el editor no tiene un
 * control por cada uno, así que se listan juntos en el paso Superpoderes.
 */
export function erroresDeAcciones(errores: Record<string, string>): string[] {
  return [...new Set(Object.entries(errores).filter(([campo]) => /^(tools|playbooks)\b/.test(campo)).map(([, m]) => m))];
}

/** Texto único de un resumen de avisos para la lista de agentes. */
export function resumenDeLaLista(afectados: number): string {
  return afectados === 1
    ? "1 agente nombra algo que ya no existe."
    : `${afectados} agentes nombran algo que ya no existe.`;
}
