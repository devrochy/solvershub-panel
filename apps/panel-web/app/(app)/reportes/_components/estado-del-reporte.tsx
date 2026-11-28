import { Badge } from "@/components/ui/badge";
import type { FeedbackReporteResumen } from "@/lib/api/types";
import { ESTADOS_DE_REPORTE, esDuplicado } from "@/lib/feedback";

/**
 * Estado del reporte con su etiqueta; un rechazo por duplicado lo dice (sin enlace al otro reporte). Sin
 * `"use client"`: lo usan la lista (cliente) y el detalle (servidor).
 */
export function EstadoDelReporte({ reporte }: { reporte: Pick<FeedbackReporteResumen, "estado" | "motivo_codigo"> }) {
  const estado = ESTADOS_DE_REPORTE[reporte.estado];
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <Badge variant={estado.variant}>{estado.label}</Badge>
      {esDuplicado(reporte) && <Badge variant="neutral">Duplicado</Badge>}
    </span>
  );
}
