import Link from "next/link";

import { PasarAProduccion } from "@/app/(app)/conexiones/_components/meta/pasar-a-produccion";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "Pasar a producción" };

type PromotionState = components["schemas"]["PromotionState"];

/** Paso de Producción: del número de prueba al real con la app propia de Meta (antes `meta/[id]/pasar-a-produccion`). */
export default async function PasarAProduccionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "produccion");
  const metaId = ficha?.conexion.meta_connection_id;
  if (!metaId) return null;
  const res = await apiFetch<PromotionState>(`/admin/meta/connections/${encodeURIComponent(metaId)}/promotion`);

  return (
    <SeccionFicha
      titulo="Pasar a producción"
      descripcion="Cambia tu conexión de WhatsApp con tu propia app de Meta del número de prueba a tu número real."
      acciones={
        <Button asChild variant="ghost" size="sm">
          <Link href={`/conexiones/${id}/produccion`}>← Volver a Producción</Link>
        </Button>
      }
    >
      {res.ok ? (
        <PasarAProduccion estado={res.data} />
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudo cargar la conexión: {res.error}
        </p>
      )}
    </SeccionFicha>
  );
}
