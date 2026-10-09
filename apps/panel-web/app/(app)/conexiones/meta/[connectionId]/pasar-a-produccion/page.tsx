import Link from "next/link";

import { PasarAProduccion } from "@/app/(app)/conexiones/meta/[connectionId]/pasar-a-produccion/_components/pasar-a-produccion";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

export const metadata = { title: "Pasar a producción" };

type PromotionState = components["schemas"]["PromotionState"];

export default async function PasarAProduccionPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const res = await apiFetch<PromotionState>(`/admin/meta/connections/${encodeURIComponent(connectionId)}/promotion`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/conexiones/meta">← Volver</Link>
        </Button>
      </div>
      <PageHeader
        title="Pasar a producción"
        description="Cambia tu conexión de WhatsApp con tu propia app de Meta del número de prueba a tu número real."
      />
      {res.ok ? (
        <PasarAProduccion estado={res.data} />
      ) : (
        <p role="alert" className="text-danger">
          No se pudo cargar la conexión: {res.error}
        </p>
      )}
    </div>
  );
}
