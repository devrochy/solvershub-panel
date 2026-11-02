import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Envuelve los controles de un formulario: si la persona solo puede ver, quedan desactivados (un
 * `fieldset disabled` apaga también los interruptores) y se explica por qué. El backend igual
 * rechaza el cambio; esto evita que se escriba algo que no se podrá guardar.
 */
export function ControlesEditables({
  puedeEditar,
  className,
  children,
}: {
  puedeEditar: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <fieldset disabled={!puedeEditar} className={cn("m-0 min-w-0 border-0 p-0", className)}>
      {children}
    </fieldset>
  );
}

/** Aviso de solo lectura; va donde iría el botón de guardar. */
export function AvisoSoloLectura() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-text-soft">
      <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Solo puedes ver esta sección. Pídele acceso de edición a quien administra el negocio.
    </p>
  );
}
