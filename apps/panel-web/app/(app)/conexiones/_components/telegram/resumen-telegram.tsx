import { CheckCircle2 } from "lucide-react";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import {
  enlaceDeBot,
  estadoTelegram,
  puedeEscribirTelegram,
  usuarioDeBot,
  type ConexionTelegram,
} from "@/lib/conexion-telegram";

import { RefrescarTelegram, RepararWebhookTelegram } from "./acciones-telegram";

/** Una fila de datos: qué es, su valor y, si hay, su acción a la derecha. */
function Fila({ titulo, detalle, children }: { titulo: string; detalle: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft py-3 text-sm first:border-t-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-headline">{titulo}</span>
        <span className="text-xs text-text-soft break-all">{detalle}</span>
      </span>
      {children}
    </li>
  );
}

function fecha(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Resumen y salud de un bot de Telegram (HU-CONN-27, ADR-0199 §12): el estado de la última revisión en palabras, el
 * @usuario del bot con su enlace y la recepción de mensajes (webhook, pendientes y el último error que informó
 * Telegram). Revisar ahora y reparar el webhook son del propietario o el master; pausar y desconectar están en la
 * cabecera.
 */
export async function ResumenTelegram({ id, alta }: { id: string; alta?: string }) {
  const [res, me] = await Promise.all([
    apiFetch<ConexionTelegram>(`/admin/connections/telegram/${encodeURIComponent(id)}`),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!res.ok) {
    return (
      <SeccionFicha titulo="Resumen y salud">
        <ErrorDeCarga titulo="No se pudo cargar el bot de Telegram" detalle={res.error} />
      </SeccionFicha>
    );
  }
  const c = res.data;
  const escribe = me.ok && puedeEscribirTelegram(me.data);
  const estado = c.active
    ? estadoTelegram(c.status)
    : { label: "Pausada", tono: "neutral" as const, detalle: "No recibe ni responde mensajes hasta que la reanudes." };
  const enlace = enlaceDeBot(c.bot_username);
  const ultimaRevision = fecha(c.last_checked_at);
  const ultimoMensaje = fecha(c.last_update_at);

  return (
    <SeccionFicha
      titulo={estado.label}
      descripcion={estado.detalle}
      acciones={escribe ? <RefrescarTelegram connectionId={c.connection_id} /> : undefined}
    >
      {alta === "1" && c.status === "connected" && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-status-success-fg" aria-hidden />
          <p className="text-body">
            Tu bot quedó conectado. Ábrelo en Telegram, toca Iniciar y escríbele: el agente te responde por ahí.
          </p>
        </div>
      )}

      {c.last_error_message && (
        <p className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          Telegram informó: «{c.last_error_message}»{fecha(c.last_error_at) ? ` (${fecha(c.last_error_at)})` : ""}.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h3">Bot</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col">
            <Fila
              titulo={usuarioDeBot(c.bot_username)}
              detalle={
                enlace ? (
                  <a href={enlace} target="_blank" rel="noreferrer" className="underline">
                    {enlace}
                  </a>
                ) : (
                  "Sin usuario"
                )
              }
            >
              <Badge variant={estado.tono}>{estado.label}</Badge>
            </Fila>
            {c.bot_name && <Fila titulo="Nombre visible" detalle={c.bot_name} />}
            <Fila titulo="Último mensaje recibido" detalle={ultimoMensaje ?? "Todavía ninguno"} />
            {ultimaRevision && <Fila titulo="Última revisión" detalle={ultimaRevision} />}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h3">Recepción de mensajes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col">
            <Fila
              titulo="Webhook del bot"
              detalle={
                c.status === "degraded" || c.status === "error"
                  ? "Si otro sistema lo cambió o Telegram no pudo entregar, repáralo."
                  : "Telegram le manda a solvershub cada mensaje que recibe el bot."
              }
            >
              {escribe && <RepararWebhookTelegram connectionId={c.connection_id} />}
            </Fila>
            {c.webhook_url && <Fila titulo="Dirección" detalle={c.webhook_url} />}
            <Fila
              titulo="Mensajes esperando entrega"
              detalle={
                c.pending_update_count > 0
                  ? `${c.pending_update_count} (Telegram los guarda hasta 24 h)`
                  : "Ninguno"
              }
            />
          </ul>
          <p className="mt-3 text-xs text-text-muted">
            El bot atiende chats privados. Si lo agregas a un grupo, sus mensajes se ignoran.
          </p>
        </CardContent>
      </Card>
    </SeccionFicha>
  );
}
