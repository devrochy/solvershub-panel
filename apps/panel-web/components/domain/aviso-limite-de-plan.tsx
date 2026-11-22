import Link from "next/link";

import { FormFeedback } from "@/components/ui/form-feedback";
import { esLimiteDePlan, RUTA_MEJORAR_PLAN, TEXTO_MEJORAR_PLAN } from "@/lib/plan-limite";

/**
 * Aviso del 409 de tope o de alcance del plan (HU-BILL-05, HU-BILL-27): el mensaje de la API ya explica
 * el límite («Tu plan permite 2 agentes publicados y ya tienes 2…», «Tu plan Basic no incluye Instagram…»);
 * aquí se suma el camino para crecer.
 */
export function AvisoLimiteDePlan({ mensaje }: { mensaje: string }) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-md bg-status-warning-bg px-3 py-2 text-sm text-status-warning-fg sm:flex-row sm:items-center sm:justify-between"
    >
      <span>{mensaje}</span>
      <Link href={RUTA_MEJORAR_PLAN} className="shrink-0 font-medium underline underline-offset-2">
        {TEXTO_MEJORAR_PLAN}
      </Link>
    </div>
  );
}

/**
 * El resultado de una acción con el `code` del error del BFF: si es del plan (`esLimiteDePlan`), el aviso
 * con «Mejorar mi plan»; si no, el `FormFeedback` de siempre.
 */
export function ResultadoConPlan({
  error,
  code,
  success,
  className,
}: {
  error?: string;
  code?: string | null;
  success?: React.ReactNode;
  className?: string;
}) {
  if (error && esLimiteDePlan(code)) return <AvisoLimiteDePlan mensaje={error} />;
  return <FormFeedback error={error} success={success} className={className} />;
}
