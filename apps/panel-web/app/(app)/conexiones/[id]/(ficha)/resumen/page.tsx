import { CheckCircle2 } from "lucide-react";

import { ReregistrarWebhooksTwilio, RefrescarTwilio } from "@/app/(app)/conexiones/_components/twilio/acciones-twilio";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { estadoTwilio, puedeEscribirTwilio, type ConexionTwilio } from "@/lib/conexion-twilio";

export const metadata = { title: "Resumen y salud" };

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

/**
 * Resumen y salud de un número de WhatsApp vía Twilio (HU-CONN-13, ADR-0186 §10): el estado de la última
 * revisión en palabras, el número y la cuenta, y la recepción de mensajes (webhooks). Revisar ahora y registrar
 * de nuevo los webhooks son del propietario o el master; pausar y eliminar están en la cabecera.
 */
export default async function ResumenTwilioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ alta?: string }>;
}) {
  const [{ id }, { alta }] = await Promise.all([params, searchParams]);
  const ficha = await fichaDePestana(id, "resumen");
  if (!ficha) return null;
  const [res, me] = await Promise.all([
    apiFetch<ConexionTwilio>(`/admin/connections/twilio/${encodeURIComponent(id)}`),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!res.ok) {
    return (
      <SeccionFicha titulo="Resumen y salud">
        <ErrorDeCarga titulo="No se pudo cargar la conexión de Twilio" detalle={res.error} />
      </SeccionFicha>
    );
  }
  const c = res.data;
  const escribe = me.ok && puedeEscribirTwilio(me.data);
  const estado = c.active ? estadoTwilio(c.status) : { label: "Pausada", tono: "neutral" as const, detalle: "No recibe ni manda mensajes hasta que la reanudes." };

  return (
    <SeccionFicha
      titulo={estado.label}
      descripcion={estado.detalle}
      acciones={escribe ? <RefrescarTwilio connectionId={c.connection_id} /> : undefined}
    >
      {alta === "1" && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-status-success-fg" aria-hidden />
          <p className="text-body">
            Tu número quedó conectado. Escríbele desde tu WhatsApp y manda una prueba desde la pestaña Prueba para
            confirmarlo.
          </p>
        </div>
      )}

      {c.last_error_code != null && (
        <p className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          Twilio respondió con el código {c.last_error_code} en la última revisión.
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h3">Número</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col">
            <Fila titulo="WhatsApp" detalle={<span className="tabular-nums">{c.sender_e164}</span>}>
              <Badge variant={estado.tono}>{estado.label}</Badge>
            </Fila>
            {c.display_name && <Fila titulo="Nombre visible" detalle={c.display_name} />}
            <Fila titulo="Estado en Twilio" detalle={c.sender_status || "Sin revisar"} />
            <Fila titulo="Cuenta de Twilio" detalle={c.account_sid} />
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
              titulo="Webhooks del número"
              detalle={
                c.status === "degraded"
                  ? "Si alguien los cambió en la consola de Twilio, regístralos de nuevo."
                  : "Twilio le avisa a solvershub de cada mensaje y de su entrega."
              }
            >
              {escribe && <ReregistrarWebhooksTwilio connectionId={c.connection_id} />}
            </Fila>
            {c.webhook_inbound_url && <Fila titulo="Mensajes entrantes" detalle={c.webhook_inbound_url} />}
            {c.webhook_status_url && <Fila titulo="Estados de entrega" detalle={c.webhook_status_url} />}
            {c.tenia_webhook_previo && (
              <Fila
                titulo="Dirección anterior"
                detalle="El número mandaba sus mensajes a otra dirección antes de conectarlo: la guardamos."
              />
            )}
          </ul>
        </CardContent>
      </Card>
    </SeccionFicha>
  );
}
