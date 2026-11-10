import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { MensajePrueba } from "@/app/(app)/conexiones/_components/meta/mensaje-prueba";
import {
  MetodoDePago,
  PermisoDeAcceso,
  RevisarAhora,
  VolverAConectar,
} from "@/app/(app)/conexiones/_components/meta/meta-health-actions";
import { MetaHealthChecks } from "@/app/(app)/conexiones/_components/meta/meta-health-checks";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { formatDate, formatDateTime } from "@/lib/format";
import { ANCLA_WEBHOOKS, anclaFacturacion } from "@/lib/meta-salud";

export const metadata = { title: "Salud" };

type HealthConnection = components["schemas"]["HealthConnection"];
type Opciones = components["schemas"]["TestMessageOptions"];

const ORIGENES: Record<string, string> = {
  byok: "Tu propia app de Meta",
  embedded_signup: "Conectada con Facebook",
  manual: "Datos cargados a mano",
};

function vencimientoDelPermiso(fecha: string | null | undefined) {
  if (!fecha) return <span className="text-text-soft">Sin fecha de vencimiento</span>;
  const dias = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  if (dias <= 0) return <Badge variant="danger">Venció el {formatDate(fecha)}</Badge>;
  if (dias <= 7) return <Badge variant="warning">Vence en {dias} día{dias === 1 ? "" : "s"}</Badge>;
  return <span className="text-text-soft">Vence el {formatDate(fecha)}</span>;
}

/** Una fila de mantenimiento: qué es, cómo está y su acción a la derecha. */
function Fila({ id, titulo, detalle, children }: { id?: string; titulo: string; detalle: React.ReactNode; children: React.ReactNode }) {
  return (
    <li id={id} className="flex scroll-mt-20 flex-wrap items-center justify-between gap-3 border-t border-border-soft py-3 text-sm first:border-t-0">
      <span className="flex min-w-0 flex-col">
        <span className="text-headline">{titulo}</span>
        <span className="text-xs">{detalle}</span>
      </span>
      {children}
    </li>
  );
}

/**
 * Salud de la cuenta de Meta del número (HU-UX-09, rediseñada en CON-09): arriba si todo funciona
 * y una sola acción, «Revisar ahora»; luego cada revisión en palabras con su arreglo, el
 * mantenimiento (permiso, pago, recepción) y el mensaje de prueba. Eliminar la cuenta está en el
 * menú de la cabecera.
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
      <SeccionFicha titulo="Salud">
        {healthRes.ok ? (
          <ErrorDeCarga titulo="No encontramos la cuenta de Meta de este número" />
        ) : (
          <ErrorDeCarga titulo="No se pudo revisar la salud" detalle={healthRes.error} />
        )}
      </SeccionFicha>
    );
  }

  const checks = cuenta.checks ?? [];
  const pendientes = checks.filter((c) => c.ok === false).length;
  const titulo =
    checks.length === 0 ? "Salud" : pendientes === 0 ? "Todo funciona" : `${pendientes} ${pendientes === 1 ? "cosa" : "cosas"} por revisar`;
  const entorno = cuenta.environment === "production" ? "En producción" : "En prueba";
  const revisado = cuenta.last_health_check_at ? `Revisado el ${formatDateTime(cuenta.last_health_check_at)}` : "Sin revisar";

  return (
    <SeccionFicha
      titulo={titulo}
      descripcion={`${revisado} · ${entorno} · ${ORIGENES[cuenta.origin] ?? "Cuenta de WhatsApp Business"}.`}
      acciones={<RevisarAhora connectionId={cuenta.id} />}
    >
      {alta === "1" && cuenta.status === "connected" && (
        <div role="status" className="flex items-start gap-2 rounded-lg border border-status-success-border bg-status-success-bg p-4 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 text-status-success-fg" aria-hidden />
          <p className="text-body">
            Tu número quedó conectado. Envía un mensaje de prueba para confirmarlo y agrega el método de pago en WhatsApp
            Manager de Meta.
          </p>
        </div>
      )}

      {cuenta.status_reason && (
        <p className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          {cuenta.status_reason}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle as="h3">Revisión</CardTitle>
        </CardHeader>
        <CardContent>
          <MetaHealthChecks connectionId={cuenta.id} checks={checks} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h3">Mantenimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col">
            <Fila titulo="Permiso de acceso a Meta" detalle={vencimientoDelPermiso(cuenta.token_expires_at)}>
              <PermisoDeAcceso connectionId={cuenta.id} />
            </Fila>
            <Fila
              id={anclaFacturacion(cuenta.id)}
              titulo="Método de pago en Meta"
              detalle={<span className="text-text-soft">Meta no lo informa: márcalo cuando lo agregues en WhatsApp Manager.</span>}
            >
              <MetodoDePago connectionId={cuenta.id} billingStatus={cuenta.billing_manual_status ?? ""} />
            </Fila>
            <Fila
              id={ANCLA_WEBHOOKS}
              titulo="Recepción de mensajes"
              detalle={<span className="text-text-soft">Si los mensajes dejan de llegar, vuelve a conectarla.</span>}
            >
              <VolverAConectar connectionId={cuenta.id} />
            </Fila>
            {cuenta.origin === "byok" && (
              <Fila
                titulo={cuenta.environment === "sandbox" ? "Pasar a producción" : "Requisitos de tu app"}
                detalle={
                  <span className="text-text-soft">
                    {cuenta.environment === "sandbox"
                      ? "Tu app de Meta está en prueba: solo atiende a números de prueba."
                      : "Lo que Meta le pide a tu app para seguir en producción."}
                  </span>
                }
              >
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/conexiones/${id}/produccion/pasar`}>{cuenta.environment === "sandbox" ? "Empezar" : "Ver"}</Link>
                </Button>
              </Fila>
            )}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle as="h3">Enviar un mensaje de prueba</CardTitle>
        </CardHeader>
        <CardContent>
          {pruebaRes.ok ? (
            <MensajePrueba connectionId={cuenta.id} opciones={pruebaRes.data} />
          ) : (
            <ErrorDeCarga titulo="No se pudo preparar la prueba" detalle={pruebaRes.error} />
          )}
        </CardContent>
      </Card>
    </SeccionFicha>
  );
}
