import Link from "next/link";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RUTA_MEJORAR_PLAN, TEXTO_MEJORAR_PLAN } from "@/lib/plan-limite";

export const RUTA_EXPORTAR_CONVERSACIONES = "/api/conversations/export";

/**
 * «Exportar conversaciones» en CSV (HU-BILL-25, HU-BILL-27). Habilitado solo si el plan trae
 * `features.exportar`; si no, el botón atenuado dice dónde viene y lleva a mejorar el plan.
 * `incluido = null` (el plan no se pudo leer, p. ej. un colaborador sin la sección Plan): no se muestra.
 */
export function ExportarConversaciones({ incluido }: { incluido: boolean | null }) {
  if (incluido === null) return null;
  if (incluido) {
    return (
      <Button asChild variant="outline">
        <a href={RUTA_EXPORTAR_CONVERSACIONES} download>
          <Download aria-hidden className="h-4 w-4" />
          Exportar conversaciones
        </a>
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" disabled aria-describedby="exportar-solo-premium">
        <Download aria-hidden className="h-4 w-4" />
        Exportar conversaciones
      </Button>
      <span id="exportar-solo-premium" className="text-xs text-text-soft">
        Disponible en Premium.{" "}
        <Link href={RUTA_MEJORAR_PLAN} className="font-medium text-link underline underline-offset-2">
          {TEXTO_MEJORAR_PLAN}
        </Link>
      </span>
    </div>
  );
}
