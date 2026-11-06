import Link from "next/link";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ChecklistProduccion } from "@/components/domain/checklist-produccion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionProduction } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "Producción" };

/** Producción de la cuenta de Meta (HU-CONN-07): su checklist, revisado con sus credenciales. */
export default async function ProduccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "produccion");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!metaId) return null;
  const res = await apiFetch<ConnectionProduction>(`/admin/meta/connections/${metaId}/production`);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {res.status === 404 ? "Cuenta de Meta no encontrada." : `No se pudo cargar el checklist: ${res.error}`}
      </p>
    );
  }
  const data = res.data;
  const prueba = data.environment === "sandbox";

  return (
    <SeccionFicha
      titulo="Producción"
      descripcion="Lo que necesita esta cuenta para atender clientes reales, revisado con sus propias credenciales."
      acciones={
        <>
          <Button asChild variant="outline" size="sm">
            <Link href={`/conexiones/${id}/produccion/pasar`}>Pasar a producción</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/conexiones/requisitos">Requisitos de Meta</Link>
          </Button>
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="neutral">{data.channel}</Badge>
        <Badge variant={prueba ? "warning" : "neutral"}>{prueba ? "Prueba" : "Producción"}</Badge>
      </div>
      {prueba && (
        <p className="text-sm text-body">
          Esta cuenta está en el entorno de prueba de Meta: el número de prueba no atiende clientes reales. El checklist igual
          te muestra qué le falta.
        </p>
      )}
      <ChecklistProduccion connectionId={metaId} endpoint={`/api/meta/connections/${metaId}/production`} initial={data} />
    </SeccionFicha>
  );
}
