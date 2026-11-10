import Link from "next/link";

import { WebhookRegister } from "@/app/(app)/conexiones/_components/meta/webhook-register";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { BotonCopiar } from "@/components/domain/boton-copiar";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import type { ConnectionsResponse } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "Webhook" };

type Subscription = components["schemas"]["SubscriptionItem"];

const ORIGENES: Record<string, string> = {
  byok: "Tu propia app de Meta",
  embedded_signup: "Conectada con Facebook",
  manual: "Datos cargados a mano",
};

/**
 * Webhook de la cuenta de Meta (CON-17): por dónde Meta le avisa a SolversHub de cada mensaje.
 * La dirección se copia con un botón; el registro se lee en una lista de datos.
 */
export default async function WebhookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "webhook");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!metaId) return null;
  const [webhooksRes, connectionsRes] = await Promise.all([
    apiFetch<{ subscriptions: Subscription[] }>("/admin/meta/webhooks"),
    apiFetch<ConnectionsResponse>("/admin/connections"),
  ]);
  const suscripcion = webhooksRes.ok ? webhooksRes.data.subscriptions.find((s) => s.connection_id === metaId) : undefined;
  const webhookUrl = connectionsRes.ok ? connectionsRes.data.webhook_url : null;

  return (
    <SeccionFicha
      titulo="Webhook"
      descripcion="La dirección por la que Meta le avisa a SolversHub de cada mensaje que llega a esta cuenta."
      acciones={
        <Button asChild variant="ghost">
          <Link href={`/conexiones/${id}/webhook/credenciales`}>Datos de la cuenta</Link>
        </Button>
      }
    >
      {webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle as="h3">Dirección del webhook</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <code className="block break-all rounded-md bg-bg-deep px-3 py-2 font-mono text-xs text-body">{webhookUrl}</code>
            <div>
              <BotonCopiar texto={webhookUrl} etiqueta="Copiar dirección" />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h3">Registro en Meta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!webhooksRes.ok ? (
            <ErrorDeCarga titulo="No se pudo leer el registro del webhook" detalle={webhooksRes.error} />
          ) : !suscripcion ? (
            <p className="text-sm text-text-soft">Esta cuenta todavía no tiene el webhook registrado en Meta.</p>
          ) : (
            <>
              <dl className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
                <dt className="text-text-soft">Estado</dt>
                <dd>
                  {suscripcion.active === null ? (
                    <Badge variant="neutral">Sin datos</Badge>
                  ) : (
                    <Badge variant={suscripcion.active ? "success" : "danger"}>{suscripcion.active ? "Recibe mensajes" : "No recibe mensajes"}</Badge>
                  )}
                </dd>
                <dt className="text-text-soft">App de Meta</dt>
                <dd className="text-body">
                  {suscripcion.uses_platform_app ? "La de SolversHub" : (ORIGENES[suscripcion.origin] ?? suscripcion.origin)}
                </dd>
                <dt className="text-text-soft">Dirección registrada</dt>
                <dd className="break-all font-mono text-xs text-body">{suscripcion.callback_url ?? "—"}</dd>
                <dt className="text-text-soft">Avisos que recibe</dt>
                <dd className="text-body">{suscripcion.fields.length > 0 ? suscripcion.fields.join(", ") : "—"}</dd>
                {suscripcion.last_error && (
                  <>
                    <dt className="text-text-soft">Último error</dt>
                    <dd className="break-all text-status-danger-fg">{suscripcion.last_error}</dd>
                  </>
                )}
              </dl>
              <WebhookRegister
                connectionId={suscripcion.connection_id}
                canRegister={suscripcion.can_register}
                usesPlatformApp={suscripcion.uses_platform_app}
              />
            </>
          )}
        </CardContent>
      </Card>
    </SeccionFicha>
  );
}
