import Link from "next/link";

import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ChecklistProduccion } from "@/components/domain/checklist-produccion";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionProduction } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "Producción" };

/**
 * Producción de la cuenta de Meta (HU-CONN-07, CON-17): lo que le falta para atender clientes
 * reales, revisado con sus credenciales. En prueba, «Pasar a producción» es la acción principal.
 */
export default async function ProduccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "produccion");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!metaId) return null;
  const res = await apiFetch<ConnectionProduction>(`/admin/meta/connections/${metaId}/production`);
  if (!res.ok) {
    return (
      <SeccionFicha titulo="Producción">
        {res.status === 404 ? (
          <ErrorDeCarga titulo="No encontramos la cuenta de Meta de este número" />
        ) : (
          <ErrorDeCarga titulo="No se pudo revisar la producción" detalle={res.error} />
        )}
      </SeccionFicha>
    );
  }
  const data = res.data;
  const prueba = data.environment === "sandbox";

  return (
    <SeccionFicha
      titulo={prueba ? "En prueba" : "En producción"}
      descripcion={
        prueba
          ? "La cuenta está en el entorno de prueba de Meta: solo atiende números de prueba. Esto es lo que le falta para atender clientes reales."
          : "La cuenta atiende clientes reales. Esto es lo que Meta le pide para seguir así."
      }
      acciones={
        <>
          <Button asChild variant="ghost">
            <Link href="/conexiones/requisitos">Requisitos de Meta</Link>
          </Button>
          {prueba && (
            <Button asChild variant="accent">
              <Link href={`/conexiones/${id}/produccion/pasar`}>Pasar a producción</Link>
            </Button>
          )}
        </>
      }
    >
      <ChecklistProduccion connectionId={metaId} endpoint={`/api/meta/connections/${metaId}/production`} initial={data} />
    </SeccionFicha>
  );
}
