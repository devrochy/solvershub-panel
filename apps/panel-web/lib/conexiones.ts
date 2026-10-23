import type { ConnectionsConsole } from "@/lib/api/types";
import { formatNumber, formatUsd } from "@/lib/format";

/**
 * Consola de conexiones (HU-AOS-23): reglas puras de presentación. Sin JSX ni fetch.
 */

export type ConexionConsola = ConnectionsConsole["items"][number];
export type AgenteConsola = ConexionConsola["agents"][number];
type Tono = "success" | "warning" | "danger" | "info" | "neutral";

/** Campo de la vista de credenciales de una conexión (GET .../credentials). */
export type CampoCredencial = {
  name: string;
  label: string;
  value?: string | null;
  secret: boolean;
  configured: boolean;
  platform?: boolean;
};

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

/** Alcance de la pausa, junto al botón y en la confirmación (lo pidió el dueño tras confundirse en test). */
export const TEXTO_ALCANCE_PAUSA =
  "Pausa solo este canal; los demás canales del negocio siguen atendiendo.";

/** ¿Es el chat web? Su pausa es el mismo interruptor que Configuración → Chat web. */
export function esChatWeb(c: Pick<ConexionConsola, "type_id">): boolean {
  return c.type_id === "webchat";
}

/** Texto de la confirmación de pausa: en Meta alcanza a todos los números de la cuenta. */
export function textoConfirmarPausa(c: Pick<ConexionConsola, "pause_scope" | "label" | "type_id">): string {
  if (c.pause_scope === "meta_account") {
    return `Se pausa la cuenta de Meta de «${c.label}»: alcanza a todos los números de esa cuenta. Lo que entre se guarda sin respuesta hasta que la reactives. ${TEXTO_ALCANCE_PAUSA}`;
  }
  if (esChatWeb(c)) {
    return `El chat web deja de responder: quien abra el chat verá que está en pausa y no podrá escribir hasta que lo reanudes. Es el mismo interruptor de Configuración → Chat web. ${TEXTO_ALCANCE_PAUSA}`;
  }
  return `La conexión «${c.label}» deja de responder: lo que entre se guarda sin respuesta y no sale nada por ella hasta que la reactives. ${TEXTO_ALCANCE_PAUSA}`;
}

/**
 * ¿La consola ofrece pausar o reanudar? Solo con permiso de edición y donde la pausa detiene de
 * verdad: la cuenta de Meta y las conexiones sin cuenta (manuales, WhatsApp Web y chat web).
 */
export function puedePausar(
  c: Pick<ConexionConsola, "pausable" | "meta_connection_id" | "pause_scope">,
  canEdit: boolean,
): boolean {
  if (!canEdit || !c.pausable) return false;
  if (c.pause_scope === "meta_account") return c.meta_connection_id != null;
  return c.pause_scope === "connection";
}

/** ¿A dónde lleva «Gestionar» según el tipo de conexión? */
export type GestionConexion =
  | { tipo: "enlace"; href: string; label: string }
  | { tipo: "editar" };

export function gestionDeConexion(
  c: Pick<ConexionConsola, "meta_connection_id" | "type_id">,
): GestionConexion | null {
  // Las Páginas de Messenger comparten la cuenta de Meta, pero su hub no es el de WhatsApp (números, plantillas).
  if (c.type_id === "messenger_meta") {
    return { tipo: "enlace", href: "/conexiones/messenger", label: "Gestionar" };
  }
  if (c.type_id === "instagram_meta") {
    return { tipo: "enlace", href: "/conexiones/instagram", label: "Gestionar" };
  }
  if (c.meta_connection_id) {
    return { tipo: "enlace", href: `/conexiones/meta/${c.meta_connection_id}`, label: "Gestionar" };
  }
  if (!c.type_id) return null;
  if (c.type_id === "whatsapp_waweb") {
    return { tipo: "enlace", href: "/conexiones/waweb", label: "WhatsApp Web" };
  }
  if (c.type_id === "google_calendar") {
    return { tipo: "enlace", href: "/calendario", label: "Gestionar" };
  }
  if (c.type_id === "webchat") {
    return { tipo: "enlace", href: "/configuracion", label: "Gestionar" };
  }
  // Correo y demás tipos manuales: se gestionan con el formulario de credenciales.
  return { tipo: "editar" };
}

/** Pestañas del hub de una conexión Meta (el QR no tiene WABA ni plantillas). */
export function metaTabs(connectionId: string): { href: string; label: string }[] {
  const base = `/conexiones/meta/${connectionId}`;
  return [
    { href: base, label: "Resumen" },
    { href: `${base}/credenciales`, label: "Credenciales" },
    { href: `${base}/salud`, label: "Salud de Meta" },
    { href: `${base}/numeros`, label: "Números" },
    { href: `${base}/plantillas`, label: "Plantillas" },
    { href: `${base}/produccion`, label: "Producción" },
    { href: `${base}/webhook`, label: "Webhook" },
    { href: "/conexiones/requisitos", label: "Requisitos" },
  ];
}

/** Qué hace el alta al elegir una tarjeta del catálogo. */
export type DestinoAlta = { tipo: "formulario" } | { tipo: "navegar"; href: string };

export function destinoDeAlta(type: {
  id: string;
  available: boolean;
  setup_kind: string;
  has_schema: boolean;
}): DestinoAlta | null {
  if (!type.available) return null;
  if (type.setup_kind === "manual" && type.has_schema) return { tipo: "formulario" };
  if (type.id === "whatsapp_waweb") return { tipo: "navegar", href: "/conexiones/waweb" };
  if (type.id === "whatsapp_meta") return { tipo: "navegar", href: "/conexiones/whatsapp" };
  if (type.id === "messenger_meta") return { tipo: "navegar", href: "/conexiones/messenger" };
  if (type.id === "instagram_meta") return { tipo: "navegar", href: "/conexiones/instagram" };
  if (type.id === "google_calendar") return { tipo: "navegar", href: "/calendario" };
  return null;
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
