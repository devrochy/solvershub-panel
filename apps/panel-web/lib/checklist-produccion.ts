/**
 * Checklist de producción real (HU-CONN-07): estado de una corrida y reparación de cada ítem.
 *
 * El backend guarda la última corrida con fecha; el panel la pide (`POST .../run`, responde al
 * instante) y consulta el GET mientras está en curso. Sirve igual para la conexión y para la
 * app de Meta de la plataforma.
 */
import type { ReadinessItem } from "@/lib/api/types";

export type EstadoCorrida = "never" | "queued" | "running" | "done" | "failed";

export type CorridaResumen = {
  status: EstadoCorrida;
  ready?: boolean | null;
  items?: ReadinessItem[];
  error?: string | null;
};

/** Cada cuánto se consulta una corrida en curso y cuánto se espera como máximo. */
export const INTERVALO_MS = 2000;
export const ESPERA_MAXIMA_MS = 3 * 60 * 1000;

export function enCurso(status: EstadoCorrida | string | undefined): boolean {
  return status === "queued" || status === "running";
}

/** Texto y color del resumen de la corrida. */
export function resumenCorrida(corrida: CorridaResumen): {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral";
} {
  switch (corrida.status) {
    case "never":
      return { label: "Sin revisar", variant: "neutral" };
    case "queued":
    case "running":
      return { label: "Revisando…", variant: "neutral" };
    case "failed":
      return { label: "La revisión falló", variant: "danger" };
    default: {
      if (corrida.ready) return { label: "Lista para producción", variant: "success" };
      const items = corrida.items ?? [];
      const fallan = items.filter((i) => i.ok === false).length;
      if (fallan > 0) return { label: `Falta${fallan === 1 ? "" : "n"} ${fallan}`, variant: "warning" };
      return { label: "Sin datos suficientes", variant: "neutral" };
    }
  }
}

/** Insignia de un ítem: `ok: null` es "no se pudo evaluar", no un fallo. */
export function estadoItem(ok: boolean | null | undefined): {
  label: string;
  variant: "success" | "danger" | "neutral";
} {
  if (ok === true) return { label: "ok", variant: "success" };
  if (ok === false) return { label: "falta", variant: "danger" };
  return { label: "sin dato", variant: "neutral" };
}

/** Dónde se arregla un ítem de la conexión. El backend manda un id corto, nunca una ruta. */
export function enlaceReparacion(
  action: string | null | undefined,
  connectionId: string,
): { href: string; label: string } | null {
  switch (action) {
    case "reauthorize":
      return { href: "/conexiones/whatsapp", label: "Reconectar" };
    case "add_number":
      return { href: `/conexiones/meta/${connectionId}/numeros`, label: "Ver números" };
    case "manage_templates":
    case "sync_templates":
      return { href: `/conexiones/meta/${connectionId}/plantillas`, label: "Ver plantillas" };
    case "refresh_token":
    case "subscribe_waba":
    case "resubscribe_app":
      return { href: "/conexiones/meta", label: "Ir a la salud" };
    default:
      return null;
  }
}
