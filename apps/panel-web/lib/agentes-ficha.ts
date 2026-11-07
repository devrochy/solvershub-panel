/**
 * Ficha del agente (HU-UX-09, D-37): lógica pura de la cabecera (indicadores y estado de
 * publicación) y de las pestañas Conexiones y Probar. Sin JSX ni fetch.
 *
 * Las conexiones del agente salen de la consola de conexiones (`/admin/connections/console`):
 * cada `ConsoleConnection.agents[]` trae la instancia del agente con su rol, prioridad y si es el
 * principal, y la conexión trae su tipo, salud y si está activa. Es una sola llamada paginada
 * para todo el negocio (no una por conexión).
 */
import type { AgentDetail, AgentReliability, ConnectionsConsole, PluginSummary } from "@/lib/api/types";
import { canalLabel, habilidadLabel } from "@/lib/labels";

type ConexionDeConsola = ConnectionsConsole["items"][number];
type AgenteDeConsola = ConexionDeConsola["agents"][number];
export type Tono = "success" | "warning" | "danger" | "info" | "neutral";

/** Tipo legible de una conexión: por su `type_id` y, si no lo trae, por el canal. */
const TIPO: Record<string, string> = {
  whatsapp_meta: "WhatsApp oficial (Meta)",
  whatsapp_cloud: "WhatsApp oficial (Meta)",
  whatsapp_waweb: "WhatsApp Web (QR)",
  whatsapp_web: "WhatsApp Web (QR)",
  instagram_meta: "Instagram",
  messenger_meta: "Messenger",
  webchat: "Chat web",
  google_calendar: "Google Calendar",
  wompi: "Wompi",
  smtp: "Correo (SMTP)",
};

export function tipoDeConexion(c: { type_id: string | null; channel: string }): string {
  return (c.type_id && TIPO[c.type_id]) || canalLabel(c.channel);
}

const ROL: Record<AgenteDeConsola["role"], string> = {
  core: "Coordinador",
  specialist: "Especialista",
  backoffice: "Back-office",
};

const SALUD: Record<ConexionDeConsola["health"], { label: string; tono: Tono }> = {
  ok: { label: "Sana", tono: "success" },
  degraded: { label: "Degradada", tono: "warning" },
  error: { label: "Con error", tono: "danger" },
  paused: { label: "Pausada", tono: "neutral" },
  pending: { label: "Alta sin terminar", tono: "info" },
};

export type ConexionDelAgente = {
  id: string;
  label: string;
  tipo: string;
  rol: string;
  prioridad: number;
  principal: boolean;
  /** Atiende de verdad: la conexión está activa y el agente habilitado en ella. */
  atiende: boolean;
  estado: { label: string; tono: Tono };
  /** Versión del agente en la configuración activa de la conexión; null si aún no entró. */
  version: number | null;
};

function estadoDeFila(c: ConexionDeConsola, a: AgenteDeConsola): { label: string; tono: Tono } {
  if (!c.active) return { label: "Conexión inactiva", tono: "neutral" };
  if (!a.enabled) return { label: "Deshabilitado aquí", tono: "neutral" };
  return SALUD[c.health] ?? { label: "Sin dato", tono: "neutral" };
}

/** Filas de la pestaña Conexiones: la principal primero y luego por prioridad (menor atiende antes). */
export function conexionesDelAgente(items: ConexionDeConsola[], agenteId: string): ConexionDelAgente[] {
  const filas: ConexionDelAgente[] = [];
  for (const c of items) {
    const a = c.agents.find((x) => x.agent_id === agenteId) ?? (c.coordinator?.agent_id === agenteId ? c.coordinator : null);
    if (!a) continue;
    filas.push({
      id: c.id,
      label: c.label.trim() || tipoDeConexion(c),
      tipo: tipoDeConexion(c),
      rol: ROL[a.role] ?? "Agente",
      prioridad: a.priority,
      principal: a.is_default,
      atiende: c.active && a.enabled,
      estado: estadoDeFila(c, a),
      version: a.release_version,
    });
  }
  return filas.sort(
    (x, y) => Number(y.principal) - Number(x.principal) || x.prioridad - y.prioridad || x.label.localeCompare(y.label, "es"),
  );
}

/** Instancias del agente (una por conexión): con ellas se cruza `reliability.by_agent`. */
export function instanciasDelAgente(items: ConexionDeConsola[], agenteId: string): Set<string> {
  const ids = new Set<string>();
  for (const c of items) {
    for (const a of [...c.agents, ...(c.coordinator ? [c.coordinator] : [])]) {
      if (a.agent_id === agenteId) ids.add(a.instance_id);
    }
  }
  return ids;
}

/**
 * Porcentaje de respuestas resueltas sin pasar a una persona: 1 − escaladas/turnos sobre todas las
 * instancias del agente. Bajo la muestra mínima de la API (`minimum_sample.turns`) no hay número:
 * un 100 % con 3 turnos engaña.
 */
export function resueltasSinPersona(
  porAgente: Pick<AgentReliability, "instance_id" | "turns" | "escalated">[],
  instancias: Set<string>,
  muestraMinima: number,
): { porcentaje: number | null; turnos: number } {
  let turnos = 0;
  let escaladas = 0;
  for (const fila of porAgente) {
    if (!fila.instance_id || !instancias.has(fila.instance_id)) continue;
    turnos += fila.turns;
    escaladas += fila.escalated;
  }
  if (turnos === 0 || turnos < muestraMinima) return { porcentaje: null, turnos };
  return { porcentaje: Math.round((1 - escaladas / turnos) * 1000) / 10, turnos };
}

/** «Publicado · v3» si atiende en alguna conexión; si no, «Borrador». */
export function estadoDePublicacion(publicado: boolean, ultimaVersion: number | null | undefined): {
  label: string;
  tono: "success" | "neutral";
} {
  if (publicado && ultimaVersion) return { label: `Publicado · v${ultimaVersion}`, tono: "success" };
  if (publicado) return { label: "Publicado", tono: "success" };
  return { label: "Borrador", tono: "neutral" };
}

/**
 * ¿El borrador tiene cambios que aún no están en una versión? Se guardó después de la última
 * versión publicada, o nunca se publicó.
 */
export function hayCambiosSinPublicar(agente: Pick<AgentDetail, "draft" | "versions">): boolean {
  const ultima = [...agente.versions].sort((a, b) => b.version - a.version)[0];
  if (!ultima) return true;
  return new Date(agente.draft.updated_at).getTime() > new Date(ultima.created_at).getTime();
}

/** Nombre legible del pack de un superpoder: el `display_name` de `/admin/plugins` o la etiqueta conocida. */
export function nombresDeHabilidades(plugins: Pick<PluginSummary, "id" | "display_name">[]): (skill: string) => string {
  const nombres = new Map(plugins.map((p) => [p.id, p.display_name.trim()]));
  return (skill) => nombres.get(skill) || habilidadLabel(skill);
}

/** Conexión con la que abre Probar: la elegida en la URL si es del agente, si no la principal que atiende. */
export function conexionParaProbar(filas: ConexionDelAgente[], elegida: string | null): ConexionDelAgente | null {
  const atienden = filas.filter((f) => f.atiende);
  return (
    (elegida ? filas.find((f) => f.id === elegida) : undefined) ??
    atienden.find((f) => f.principal) ??
    atienden[0] ??
    filas[0] ??
    null
  );
}

/** Desde hace `dias` días, en ISO, para las consultas de los indicadores. */
export function desdeHace(dias: number, ahora: Date = new Date()): string {
  return new Date(ahora.getTime() - dias * 86_400_000).toISOString();
}
