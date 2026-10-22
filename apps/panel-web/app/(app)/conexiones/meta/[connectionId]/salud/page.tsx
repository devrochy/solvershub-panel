import Link from "next/link";

import { MetaHealthActions } from "../../_components/meta-health-actions";
import { MetaHealthChecks } from "../../_components/meta-health-checks";
import { MetaTabs } from "../../_components/meta-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Salud de Meta" };

type HealthConnection = components["schemas"]["HealthConnection"];

/** Diagnóstico de una conexión Meta (antes en la página global de Salud de Meta). */
export default async function SaludDeConexionPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const res = await apiFetch<{ connections: HealthConnection[] }>("/admin/meta/health");
  const conexion = res.ok ? res.data.connections.find((c) => c.id === connectionId) : undefined;
  if (!conexion) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {res.ok ? "No encontramos esta conexión." : `No se pudo cargar la conexión: ${res.error}`}
      </p>
    );
  }
  const billing = conexion.billing_manual_status ?? "";

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/conexiones">← Conexiones</Link>
      </Button>

      <PageHeader
        title="Salud de Meta"
        description="Diagnóstico de la conexión y acciones sobre su token."
      />

      <MetaTabs connectionId={conexion.id} current={`/conexiones/meta/${conexion.id}/salud`} />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Estado</CardTitle>
            <Badge
              variant={
                conexion.status === "connected"
                  ? "success"
                  : conexion.status === "error"
                    ? "danger"
                    : "warning"
              }
            >
              {conexion.status}
            </Badge>
            <Badge variant={conexion.environment === "production" ? "accent" : "neutral"}>
              {conexion.environment === "production" ? "Producción" : "Prueba"}
            </Badge>
          </div>
          <p className="text-xs text-text-soft">
            Último chequeo: {formatDateTime(conexion.last_health_check_at)}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {conexion.status_reason && <p className="text-sm text-body">{conexion.status_reason}</p>}
          <MetaHealthChecks connectionId={conexion.id} checks={conexion.checks ?? []} />
          <MetaHealthActions connectionId={conexion.id} billingStatus={billing} />
        </CardContent>
      </Card>
    </div>
  );
}
