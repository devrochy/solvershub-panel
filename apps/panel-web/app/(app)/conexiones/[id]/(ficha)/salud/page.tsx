import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { EliminarCuentaDialog } from "@/app/(app)/conexiones/_components/eliminar-cuenta-dialog";
import { MensajePrueba } from "@/app/(app)/conexiones/_components/meta/mensaje-prueba";
import { MetaHealthActions } from "@/app/(app)/conexiones/_components/meta/meta-health-actions";
import { MetaHealthChecks } from "@/app/(app)/conexiones/_components/meta/meta-health-checks";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { META_CONNECTION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { formatDate, formatDateTime } from "@/lib/format";
import { anclaFacturacion } from "@/lib/meta-salud";

export const metadata = { title: "Salud" };

type HealthConnection = components["schemas"]["HealthConnection"];
type Opciones = components["schemas"]["TestMessageOptions"];

const ORIGENES: Record<string, string> = {
  byok: "Tu propia app de Meta",
  embedded_signup: "Conectada con Facebook",
  manual: "Carga manual",
};

function vencimientoDelToken(fecha: string | null | undefined) {
  if (!fecha) return <span className="text-text-soft">sin fecha</span>;
  const dias = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  const vencido = dias <= 0;
  const pronto = dias > 0 && dias <= 7;
  return (
    <Badge variant={vencido ? "danger" : pronto ? "warning" : "neutral"}>
      {vencido ? "vencido" : `vence en ${dias} día${dias === 1 ? "" : "s"} (${formatDate(fecha)})`}
    </Badge>
  );
}

/**
 * Salud de la cuenta de Meta del número (HU-UX-09): antes era el hub `/conexiones/meta/[id]` y la
 * página global «Salud de Meta». Estado, chequeos con su reparación, token, mensaje de prueba y
 * eliminar la cuenta.
 */
export default async function SaludPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ alta?: string }>;
}) {
  const [{ id }, { alta }] = await Promise.all([params, searchParams]);
  const ficha = await fichaDePestana(id, "salud");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!ficha || !metaId) return null;
  const [healthRes, pruebaRes] = await Promise.all([
    apiFetch<{ connections: HealthConnection[] }>("/admin/meta/health"),
    apiFetch<Opciones>(`/admin/meta/connections/${encodeURIComponent(metaId)}/test-message`),
  ]);
  const cuenta = healthRes.ok ? healthRes.data.connections.find((c) => c.id === metaId) : undefined;
  if (!cuenta) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {healthRes.ok ? "No encontramos la cuenta de Meta de este número." : `No se pudo cargar la salud: ${healthRes.error}`}
      </p>
    );
  }

  return (
    <SeccionFicha
      titulo="Salud"
      descripcion={`${ORIGENES[cuenta.origin] ?? "Cuenta de WhatsApp Business"}. Diagnóstico de la cuenta de Meta y acciones sobre su token.`}
    >
      {alta === "1" && cuenta.status === "connected" && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-status-success-fg" aria-hidden />
          <p className="text-body">
            Tu número quedó conectado. Envía un mensaje de prueba para confirmarlo y recuerda agregar el método de pago de
            Meta en WhatsApp Manager.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Estado</CardTitle>
            <StatusBadge value={cuenta.status} map={META_CONNECTION_STATUS} />
            <Badge variant={cuenta.environment === "production" ? "accent" : "neutral"}>
              {cuenta.environment === "production" ? "Producción" : "Prueba"}
            </Badge>
          </div>
          <p className="text-xs text-text-soft">Último chequeo: {formatDateTime(cuenta.last_health_check_at)}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-text-soft">Token:</span>
            {vencimientoDelToken(cuenta.token_expires_at)}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {cuenta.status_reason && <p className="text-sm text-body">{cuenta.status_reason}</p>}
          <MetaHealthChecks connectionId={cuenta.id} checks={cuenta.checks ?? []} />
          <div id={anclaFacturacion(cuenta.id)} className="scroll-mt-20">
            <MetaHealthActions connectionId={cuenta.id} billingStatus={cuenta.billing_manual_status ?? ""} />
          </div>
          {cuenta.origin === "byok" && (
            <div>
              <Button asChild variant={cuenta.environment === "sandbox" ? "outline" : "ghost"} size="sm">
                <Link href={`/conexiones/${id}/produccion/pasar`}>
                  {cuenta.environment === "sandbox" ? "Pasar a producción" : "Chequeos con tu app"}
                </Link>
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
            <MensajePrueba connectionId={cuenta.id} opciones={pruebaRes.data} />
          ) : (
            <p className="text-sm text-status-danger-fg">No se pudo preparar la prueba: {pruebaRes.error}</p>
          )}
        </CardContent>
      </Card>

      {ficha.consola.can_edit && (
        <Card>
          <CardHeader>
            <CardTitle>Zona de peligro</CardTitle>
            <p className="text-xs text-text-soft">
              Eliminar la cuenta archiva sus números y WABAs y revoca sus tokens. Podrás reconectarla después.
            </p>
          </CardHeader>
          <CardContent>
            <EliminarCuentaDialog
              connectionId={cuenta.id}
              label={ficha.conexion.label}
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
      )}
    </SeccionFicha>
  );
}
