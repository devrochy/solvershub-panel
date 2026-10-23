import Link from "next/link";

import { MetaTabs } from "@/app/(app)/conexiones/meta/_components/meta-tabs";
import { WebhookRegister } from "@/app/(app)/conexiones/meta/_components/webhook-register";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import type { ConnectionsResponse } from "@/lib/api/types";

export const metadata = { title: "Webhook" };

type Subscription = components["schemas"]["SubscriptionItem"];

const ORIGENES: Record<string, string> = {
  byok: "App propia",
  embedded_signup: "Conectada con Facebook",
  manual: "Carga manual",
};

/** Registro y estado del webhook de una conexión Meta (restaurado de Salud de Meta). */
export default async function WebhookDeConexionPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const [webhooksRes, connectionsRes] = await Promise.all([
    apiFetch<{ subscriptions: Subscription[] }>("/admin/meta/webhooks"),
    apiFetch<ConnectionsResponse>("/admin/connections"),
  ]);
  const suscripcion = webhooksRes.ok
    ? webhooksRes.data.subscriptions.find((s) => s.connection_id === connectionId)
    : undefined;
  const webhookUrl = connectionsRes.ok ? connectionsRes.data.webhook_url : null;

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/conexiones">← Conexiones</Link>
      </Button>

      <PageHeader
        title="Webhook"
        description="Registro de la suscripción de la app de Meta para esta conexión y su estado."
      />

      <MetaTabs connectionId={connectionId} current={`/conexiones/meta/${connectionId}/webhook`} />

      {webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle>URL del negocio</CardTitle>
            <p className="text-xs text-text-soft">
              Es la URL que se registra en Meta para recibir los eventos de este negocio.
            </p>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md bg-bg-deep px-3 py-2 font-mono text-xs text-link">
              {webhookUrl}
            </code>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registro de la suscripción</CardTitle>
          <p className="text-xs text-text-soft">
            La app de Meta de esta conexión: objeto suscrito, callback y último error.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!webhooksRes.ok ? (
            <p role="alert" className="text-status-danger-fg">
              No se pudo cargar el registro del webhook: {webhooksRes.error}
            </p>
          ) : !suscripcion ? (
            <p className="text-sm text-text-soft">
              Esta conexión todavía no tiene una suscripción de webhook asociada.
            </p>
          ) : (
            <>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <p className="text-body">
                  <span className="font-medium text-headline">App:</span>{" "}
                  {suscripcion.uses_platform_app ? "De la plataforma" : (ORIGENES[suscripcion.origin] ?? suscripcion.origin)}
                </p>
                <p className="text-body">
                  <span className="font-medium text-headline">Objeto:</span> {suscripcion.object}
                </p>
                <p className="text-body">
                  <span className="font-medium text-headline">Callback:</span>{" "}
                  <span className="break-all font-mono text-xs">{suscripcion.callback_url ?? "—"}</span>
                </p>
                <p className="flex items-center gap-2 text-body">
                  <span className="font-medium text-headline">Estado:</span>{" "}
                  {suscripcion.active === null ? (
                    <Badge variant="neutral">sin datos</Badge>
                  ) : (
                    <Badge variant={suscripcion.active ? "success" : "danger"}>
                      {suscripcion.active ? "Activa" : "Inactiva"}
                    </Badge>
                  )}
                </p>
                <p className="text-body sm:col-span-2">
                  <span className="font-medium text-headline">Campos:</span>{" "}
                  {suscripcion.fields.length > 0 ? suscripcion.fields.join(", ") : "—"}
                </p>
                <p className="text-body sm:col-span-2">
                  <span className="font-medium text-headline">Último error:</span>{" "}
                  <span className="break-all text-xs text-status-danger-fg">
                    {suscripcion.last_error ?? "—"}
                  </span>
                </p>
              </div>
              <div>
                <WebhookRegister
                  connectionId={suscripcion.connection_id}
                  canRegister={suscripcion.can_register}
                  usesPlatformApp={suscripcion.uses_platform_app}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
