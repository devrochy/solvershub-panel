import { List } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Piezas visuales de un mensaje con botones, como las ve el cliente en el teléfono. Las comparten la vista previa del
 * editor de plantillas con opciones (solo se ven) y el chat de prueba del playground (se tocan): reciben datos y no
 * saben de la API (SPEC-40, pista B2).
 */
export function BurbujaDeMensaje({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-[92%] rounded-lg rounded-tl-sm border border-border-soft bg-surface p-3 text-sm text-headline shadow-elev-1", className)}>
      {children}
    </div>
  );
}

const BASE_BOTON =
  "mt-1.5 flex max-w-[92%] items-center justify-center gap-1.5 rounded-lg border border-border-soft bg-surface px-3 py-2 text-center text-sm font-medium text-link shadow-elev-1";

/** Un botón del mensaje. Sin `onClick` solo se ve (vista previa); con `onClick` es un botón tocable. */
export function BotonDeMensaje({
  children,
  icono,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  icono?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const contenido = (
    <>
      {icono && <List className="h-4 w-4" aria-hidden />}
      {children}
    </>
  );
  if (!onClick) return <div className={BASE_BOTON}>{contenido}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        BASE_BOTON,
        "min-h-11 w-fit min-w-40 cursor-pointer transition-colors hover:border-focus/60 hover:bg-focus/10",
        "focus-visible:border-focus disabled:cursor-not-allowed disabled:opacity-50",
      )}
    >
      {contenido}
    </button>
  );
}
