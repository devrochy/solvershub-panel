import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Resultado de una acción dentro de un formulario o un diálogo (error o éxito), con ícono y
 * texto: el color nunca va solo. Para una página o un bloque que no cargó, usa `ErrorDeCarga`.
 */
export function FormFeedback({
  error,
  success,
  className,
}: {
  error?: React.ReactNode;
  success?: React.ReactNode;
  className?: string;
}) {
  if (!error && !success) return null;
  const Icono = error ? AlertCircle : CheckCircle2;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "flex items-start gap-1.5 text-sm",
        error ? "text-status-danger-fg" : "text-status-success-fg",
        className,
      )}
    >
      <Icono className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0">{error ?? success}</span>
    </p>
  );
}
