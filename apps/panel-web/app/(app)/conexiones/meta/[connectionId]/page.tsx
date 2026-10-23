import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { META_CONNECTION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { formatDateTime } from "@/lib/format";

import { MensajePrueba } from "./_components/mensaje-prueba";
import { EliminarCuentaDialog } from "../../_components/eliminar-cuenta-dialog";
import { MetaTabs } from "../_components/meta-tabs";

export const metadata = { title: "Conexión de WhatsApp" };

type HealthConnection = components["schemas"]["HealthConnection"];
type Opciones = components["schemas"]["TestMessageOptions"];

const ORIGENES: Record<string, string> = {
  byok: "Tu propia app de Meta",
  embedded_signup: "Conectada con Facebook",
  manual: "Carga manual",
};

/**
 * Hub de una conexión de WhatsApp (HU-SH-05; HU-CONN-08 lo amplía): estado, accesos a Números y
 * Plantillas, y el mensaje de prueba. Es a donde lleva el alta con Facebook al terminar.
 */
export default async function ConexionMetaPage({
  params,
  searchParams,
}: {
  params: Promise<{ connectionId: string }>;
  searchParams: Promise<{ alta?: string }>;
}) {
  const { connectionId } = await params;
  const { alta } = await searchParams;
  const [healthRes, pruebaRes] = await Promise.all([
    apiFetch<{ connections: HealthConnection[] }>("/admin/meta/health"),
    apiFetch<Opciones>(`/admin/meta/connections/${encodeURIComponent(connectionId)}/test-message`),
  ]);
  const conexion = healthRes.ok ? healthRes.data.connections.find((c) => c.id === connectionId) : undefined;
  if (!conexion) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {healthRes.ok ? "No encontramos esta conexión." : `No se pudo cargar la conexión: ${healthRes.error}`}
      </p>
    );
  }
  const numero = pruebaRes.ok ? pruebaRes.data.display_phone_number : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/conexiones">← Conexiones</Link>
        </Button>
      </div>

      <PageHeader
        title={`WhatsApp${numero ? ` · ${numero}` : ""}`}
        description={ORIGENES[conexion.origin] ?? "Conexión de WhatsApp Business"}
      />

      <MetaTabs connectionId={conexion.id} current={`/conexiones/meta/${conexion.id}`} />

      {alta === "1" && conexion.status === "connected" && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-status-success-fg" aria-hidden />
          <p className="text-body">
            Tu número quedó conectado. Envía un mensaje de prueba para confirmarlo y recuerda agregar el método de pago
            de Meta en WhatsApp Manager.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Estado</CardTitle>
            <StatusBadge value={conexion.status} map={META_CONNECTION_STATUS} />
            <Badge variant={conexion.environment === "production" ? "accent" : "neutral"}>
              {conexion.environment === "production" ? "Producción" : "Prueba"}
            </Badge>
          </div>
          <p className="text-xs text-text-soft">Último chequeo: {formatDateTime(conexion.last_health_check_at)}</p>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {conexion.status_reason && <p className="text-sm text-body">{conexion.status_reason}</p>}
          {conexion.origin === "byok" && conexion.environment === "sandbox" && (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`/conexiones/meta/${conexion.id}/pasar-a-produccion`}>Pasar a producción</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensaje de prueba</CardTitle>
        </CardHeader>
        <CardContent>
          {pruebaRes.ok ? (
            <MensajePrueba connectionId={conexion.id} opciones={pruebaRes.data} />
          ) : (
            <p className="text-sm text-status-danger-fg">No se pudo preparar la prueba: {pruebaRes.error}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Zona de peligro</CardTitle>
          <p className="text-xs text-text-soft">
            Eliminar la cuenta archiva sus números y WABAs y revoca sus tokens. Podrás reconectarla
            después.
          </p>
        </CardHeader>
        <CardContent>
          <EliminarCuentaDialog
            connectionId={conexion.id}
            label={`WhatsApp${numero ? ` · ${numero}` : ""}`}
            kind="meta_connection"
            redirectTo="/conexiones"
            trigger={
              <Button variant="danger" size="sm">
                Eliminar cuenta
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
