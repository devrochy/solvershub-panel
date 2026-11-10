import { cn } from "@/lib/utils";

const TAMANO = { md: "h-5 min-w-5 px-1.5", sm: "h-4 min-w-4 px-1" } as const;
const TONO = { normal: "bg-action", alerta: "bg-danger-strong" } as const;

/**
 * Un número sobre un ícono o al lado de un texto: mensajes sin leer, notas, notificaciones.
 * Desde 100 muestra «99+». `etiqueta` es el texto para lectores de pantalla; sin ella el
 * contador queda oculto para ellos y quien lo contiene debe nombrarlo (`aria-label`).
 */
export function Contador({
  valor,
  etiqueta,
  tono = "normal",
  tamano = "md",
  className,
}: {
  valor: number;
  etiqueta?: string;
  tono?: keyof typeof TONO;
  tamano?: keyof typeof TAMANO;
  className?: string;
}) {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-pill text-sh-caption font-semibold leading-none tabular-nums text-white",
          TAMANO[tamano],
          TONO[tono],
          className,
        )}
      >
        {valor > 99 ? "99+" : Math.max(0, valor)}
      </span>
      {etiqueta && <span className="sr-only">{etiqueta}</span>}
    </>
  );
}
