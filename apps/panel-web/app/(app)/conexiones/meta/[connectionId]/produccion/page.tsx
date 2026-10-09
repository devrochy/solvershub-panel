import Link from "next/link";

import { ChecklistProduccion } from "@/components/domain/checklist-produccion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionProduction } from "@/lib/api/types";

export const metadata = { title: "Producción" };

/** "Producción" de una conexión (HU-CONN-07): su checklist, con sus credenciales. */
export default async function ProduccionDeConexionPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const res = await apiFetch<ConnectionProduction>(`/admin/meta/connections/${connectionId}/production`);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        {res.status === 404 ? "Conexión no encontrada." : `No se pudo cargar el checklist: ${res.error}`}
      </p>
    );
  }
  const data = res.data;
  const prueba = data.environment === "sandbox";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/conexiones/meta">← Volver</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/conexiones/meta/${connectionId}/numeros`}>Números</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/conexiones/meta/${connectionId}/plantillas`}>Plantillas</Link>
        </Button>
      </div>

      <PageHeader
        title="Producción"
        description="Lo que necesita esta conexión para atender clientes reales, revisado con sus propias credenciales."
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="neutral">{data.channel}</Badge>
        <Badge variant={prueba ? "warning" : "neutral"}>{prueba ? "Prueba" : "Producción"}</Badge>
      </div>
      {prueba && (
        <p className="text-sm text-body">
          Esta conexión está en el entorno de prueba de Meta: el número de prueba no atiende clientes reales.
          El checklist igual te muestra qué le falta.
        </p>
      )}

      <ChecklistProduccion
        connectionId={connectionId}
        endpoint={`/api/meta/connections/${connectionId}/production`}
        initial={data}
      />
    </div>
  );
}
