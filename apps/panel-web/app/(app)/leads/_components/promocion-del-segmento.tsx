import { Percent } from "lucide-react";

import { PromotionDialog, type Option } from "@/app/(app)/comercio/promociones/_components/promotion-dialog";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import type { Aliado, ModulosComercio } from "@/lib/aliados";
import { apiFetch } from "@/lib/api/server";

/**
 * «Crear promoción para este segmento» desde Clientes (HU-CRM-06, D-SPEC-33-8).
 *
 * Como en agent-sale (su ADR-035), la promoción queda atada a la clasificación del filtro y no a
 * los clientes de la lista: `eligible_segments` de pack_commerce, que el agente ya respeta. Sin
 * `clasificacion` en el filtro el botón queda deshabilitado con la explicación.
 */
export async function PromocionDelSegmento({
  segmento,
  total,
}: {
  segmento: { value: string; label: string } | null;
  total: number;
}) {
  if (!segmento) {
    return (
      <Tooltip label="Filtra por clasificación: una promoción solo se limita por clasificación, no por canal, conexión ni estado del lead.">
        <Button variant="outline" disabled>
          <Percent className="h-4 w-4" aria-hidden /> Promoción para este segmento
        </Button>
      </Tooltip>
    );
  }

  const [categoriasRes, productosRes, modulosRes] = await Promise.all([
    apiFetch<Option[]>("/pack/commerce/categories"),
    apiFetch<Option[]>("/pack/commerce/products"),
    apiFetch<ModulosComercio>("/pack/commerce/modulos"),
  ]);
  const aliadosRes =
    modulosRes.ok && modulosRes.data.aliados ? await apiFetch<Aliado[]>("/pack/commerce/allies") : null;
  const aliados: Option[] | null = aliadosRes ? (aliadosRes.ok ? aliadosRes.data : []) : null;
  const clientes = total === 1 ? "el cliente de esta lista" : `los ${total} de esta lista`;

  return (
    <PromotionDialog
      categories={categoriasRes.ok ? categoriasRes.data : []}
      products={productosRes.ok ? productosRes.data : []}
      allies={aliados}
      presetSegments={[segmento.value]}
      aviso={`Aplicará a todos los clientes clasificados como «${segmento.label}», también a los que lleguen después, no solo a ${clientes}.`}
      trigger={
        <Button variant="outline">
          <Percent className="h-4 w-4" aria-hidden /> Promoción para este segmento
        </Button>
      }
    />
  );
}
