import type { ConnectionsConsole } from "@/lib/api/types";
import { formatNumber, formatUsd } from "@/lib/format";

/**
 * Consola de conexiones (HU-AOS-23): reglas puras de presentación. Sin JSX ni fetch.
 */

export type ConexionConsola = ConnectionsConsole["items"][number];
export type AgenteConsola = ConexionConsola["agents"][number];
type Tono = "success" | "warning" | "danger" | "info" | "neutral";

const SALUD: Record<ConexionConsola["health"], { label: string; tono: Tono }> = {
  ok: { label: "Sana", tono: "success" },
  degraded: { label: "Degradada", tono: "warning" },
  error: { label: "Con error", tono: "danger" },
  paused: { label: "Pausada", tono: "neutral" },
  pending: { label: "Alta sin terminar", tono: "info" },
};

export function saludDeConexion(health: ConexionConsola["health"]): { label: string; tono: Tono } {
  return SALUD[health];
}

const RUTEO: Record<ConnectionsConsole["routing"], string> = {
  off: "Apagado",
  shadow: "En sombra",
  active: "Activo",
};

export function etiquetaRuteo(routing: ConnectionsConsole["routing"]): string {
  return RUTEO[routing];
}

/** «v3» si corre en la release activa; «v4 en la próxima versión» si todavía no entró. */
export function versionDeAgente(a: Pick<AgenteConsola, "release_version" | "latest_version">): string {
  if (a.release_version != null) {
    return a.latest_version != null && a.latest_version > a.release_version
      ? `v${a.release_version} (hay v${a.latest_version})`
      : `v${a.release_version}`;
  }
  if (a.latest_version != null) return `v${a.latest_version} en la próxima versión`;
  return "sin versión publicada";
}

/** Conversacionales (llevan Coordinador y agentes) e integraciones (de todo el negocio). */
export function separarConexiones(items: ConexionConsola[]): {
  canales: ConexionConsola[];
  integraciones: ConexionConsola[];
} {
  return {
    canales: items.filter((c) => c.conversational),
    integraciones: items.filter((c) => !c.conversational),
  };
}

/** Texto de la confirmación de pausa: en Meta alcanza a todos los números de la cuenta. */
export function textoConfirmarPausa(c: Pick<ConexionConsola, "pause_scope" | "label">): string {
  if (c.pause_scope === "meta_account") {
    return `Se pausa la cuenta de Meta de «${c.label}»: alcanza a todos los números de esa cuenta. Lo que entre se guarda sin respuesta hasta que la reactives.`;
  }
  return `La conexión «${c.label}» deja de responder hasta que la reactives.`;
}

/** ¿La consola ofrece pausar o reanudar? Solo con permiso de edición y donde la pausa detiene de verdad. */
export function puedePausar(c: Pick<ConexionConsola, "pausable" | "meta_connection_id">, canEdit: boolean): boolean {
  return canEdit && c.pausable && c.meta_connection_id != null;
}

export function resumenConsumo(u: ConexionConsola["usage_7d"]): string {
  const partes = [
    `${formatNumber(u.turns)} turnos`,
    `${formatNumber(u.conversations)} conversaciones`,
    `${formatNumber(u.input_tokens + u.output_tokens)} tokens`,
  ];
  // Costo de proveedor (IA): `formatUsd`, no el dinero del negocio.
  if (u.cost_usd != null) partes.push(`${formatUsd(u.cost_usd, 2)} de IA`);
  return partes.join(" · ");
}
