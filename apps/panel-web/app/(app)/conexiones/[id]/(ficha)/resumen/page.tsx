import { CheckCircle2 } from "lucide-react";

import { ReregistrarWebhooksTwilio, RefrescarTwilio } from "@/app/(app)/conexiones/_components/twilio/acciones-twilio";
import { CodigoDeUnionTwilio, CopiarTwilio } from "@/app/(app)/conexiones/_components/twilio/sandbox-twilio";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import {
  esSandbox,
  estadoTwilio,
  mensajeDeUnion,
  numeroLegible,
  puedeEscribirTwilio,
  type ConexionTwilio,
} from "@/lib/conexion-twilio";

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
 *
 * En el Sandbox de Twilio (HU-CONN-20) no hay webhooks que registrar por API: la ficha muestra las dos direcciones
 * para copiarlas en la consola de Twilio, si ya llegó el primer mensaje que lo confirma, y el `join <código>` con
 * el que cada teléfono de prueba se une (vence a los 3 días).
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
  const sandbox = esSandbox(c);
  const estado = c.active ? estadoTwilio(c.status, c.modo) : { label: "Pausada", tono: "neutral" as const, detalle: "No recibe ni manda mensajes hasta que la reanudes." };

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
            {sandbox
              ? "El Sandbox quedó conectado. Falta pegar las dos direcciones de Recepción de mensajes en la consola de Twilio y escribirle desde un teléfono unido."
              : "Tu número quedó conectado. Escríbele desde tu WhatsApp y manda una prueba desde la pestaña Prueba para confirmarlo."}
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
            <Fila titulo="WhatsApp" detalle={<span className="tabular-nums">{numeroLegible(c.sender_e164)}</span>}>
              <span className="flex flex-wrap gap-2">
                {sandbox && <Badge variant="accent">Sandbox</Badge>}
                <Badge variant={estado.tono}>{estado.label}</Badge>
              </span>
            </Fila>
            {sandbox ? (
              <Fila
                titulo="Número compartido de Twilio"
                detalle="Solo para pruebas en este entorno: solo le llegan los mensajes de quien se unió a tu sandbox."
              />
            ) : (
              <>
                {c.display_name && <Fila titulo="Nombre visible" detalle={c.display_name} />}
                <Fila titulo="Estado en Twilio" detalle={c.sender_status || "Sin revisar"} />
              </>
            )}
            <Fila titulo="Cuenta de Twilio" detalle={c.account_sid} />
          </ul>
        </CardContent>
      </Card>

      {sandbox && (
        <Card>
          <CardHeader>
            <CardTitle as="h3">Unirse al sandbox</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              <Fila
                titulo={`Envía «${mensajeDeUnion(c.sandbox_join_code)}» al ${numeroLegible(c.sender_e164)}`}
                detalle="Desde cada teléfono de prueba, por WhatsApp. La unión vence a los 3 días: después hay que volver a enviarlo."
              >
                {escribe && <CodigoDeUnionTwilio connectionId={c.connection_id} actual={c.sandbox_join_code ?? null} />}
              </Fila>
            </ul>
          </CardContent>
        </Card>
      )}

      {sandbox ? (
        <Card>
          <CardHeader>
            <CardTitle as="h3">Recepción de mensajes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              <Fila
                titulo={c.webhook_confirmado_at ? "Direcciones confirmadas" : "Pega estas direcciones en la consola de Twilio"}
                detalle={
                  c.webhook_confirmado_at
                    ? `Llegó el primer mensaje el ${new Date(c.webhook_confirmado_at).toLocaleString("es-CO")}.`
                    : "Messaging › Try it out › Send a WhatsApp message › Sandbox settings. Se confirma con el primer mensaje que le escribas al sandbox."
                }
              />
              {c.webhook_inbound_url && (
                <Fila titulo="When a message comes in (POST)" detalle={c.webhook_inbound_url}>
                  <CopiarTwilio texto={c.webhook_inbound_url} etiqueta="la dirección de mensajes entrantes" />
                </Fila>
              )}
              {c.webhook_status_url && (
                <Fila titulo="Status callback URL (POST)" detalle={c.webhook_status_url}>
                  <CopiarTwilio texto={c.webhook_status_url} etiqueta="la dirección de estados" />
                </Fila>
              )}
            </ul>
          </CardContent>
        </Card>
      ) : (
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
      )}
    </SeccionFicha>
  );
}
