import { Ban, CheckCircle2, Circle, CircleDot, MinusCircle, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { etiquetaPrueba } from "@/lib/qa/estados";

const ICONO = {
  sin_correr: { Icono: Circle, clase: "text-text-soft" },
  en_curso: { Icono: CircleDot, clase: "text-status-info-fg" },
  omitida: { Icono: MinusCircle, clase: "text-text-soft" },
  ok: { Icono: CheckCircle2, clase: "text-status-success-fg" },
  bloqueada: { Icono: Ban, clase: "text-status-warning-fg" },
  falla: { Icono: XCircle, clase: "text-status-danger-fg" },
} as const;

/** Ícono del estado de una prueba con su nombre para lectores de pantalla. */
export function IconoEstado({ estado, className }: { estado: string | null | undefined; className?: string }) {
  const { Icono, clase } = ICONO[(estado ?? "sin_correr") as keyof typeof ICONO] ?? ICONO.sin_correr;
  return (
    <span className={cn("inline-flex shrink-0", className)}>
      <Icono aria-hidden className={cn("h-4 w-4", clase)} />
      <span className="sr-only">{etiquetaPrueba(estado)}</span>
    </span>
  );
}
