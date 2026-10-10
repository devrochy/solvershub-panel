/**
 * Requisitos de Embedded Signup de la app de la plataforma (HU-SH-05): resumen de la última
 * revisión de «App de Meta» (HU-CONN-07), que es la que revisa lo del servidor (variables de la
 * app, webhook en HTTPS y su suscripción). Los requisitos no repiten esos chequeos. La revisión vale
 * 30 días: el backend dice si venció (`expired`) y cuándo vence (`expires_at`).
 */
import type { components } from "@/lib/api/schema";
import { formatDateTime } from "@/lib/format";

export type RevisionPlataforma = components["schemas"]["EsPlatformCheck"];

export function resumenRevision(revision: RevisionPlataforma): string {
  const fecha = revision.finished_at ? ` (${formatDateTime(revision.finished_at)})` : "";
  switch (revision.status) {
    case "never":
      return "Todavía no se ha revisado la app de Meta de la plataforma.";
    case "queued":
    case "running":
      return "La revisión de la app de Meta está en curso.";
    case "failed":
      return "La última revisión de la app de Meta falló: vuelve a revisarla.";
    default:
      if (revision.expired) {
        // Vale 30 días (decisión del dueño, 2026-10-10): vencida, hay que revisar de nuevo.
        return `La última revisión venció${fecha}: vale 30 días, corre la revisión de nuevo en App de Meta.`;
      }
      return revision.ok ? `La última revisión está en verde${fecha}.` : `La última revisión tiene pendientes${fecha}:`;
  }
}
