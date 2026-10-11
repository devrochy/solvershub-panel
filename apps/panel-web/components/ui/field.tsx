import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Campo de formulario: etiqueta + control + ayuda/error. Solo presentación.
 *
 * Si el control es un solo elemento y hay `htmlFor`, se le agregan `aria-describedby`
 * (ayuda o error) y `aria-invalid` (con error), para que el lector de pantalla lea el
 * mensaje junto al campo. El error lleva ícono: el rojo nunca va solo.
 */
export function Field({
  label,
  htmlFor,
  help,
  error,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  help?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const idMensaje = htmlFor && (error || help) ? `${htmlFor}-mensaje` : undefined;
  const control =
    idMensaje && isValidElement(children)
      ? cloneElement(children as ReactElement<Record<string, unknown>>, {
          "aria-describedby": idMensaje,
          ...(error ? { "aria-invalid": true } : {}),
        })
      : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-body">
        {label}
        {required && (
          <span className="text-status-danger-fg">
            {" *"}
            <span className="sr-only">(obligatorio)</span>
          </span>
        )}
      </label>
      {control}
      {error ? (
        <p id={idMensaje} role="alert" className="flex items-start gap-1 text-xs text-status-danger-fg">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        help && (
          <p id={idMensaje} className="text-xs text-text-soft">
            {help}
          </p>
        )
      )}
    </div>
  );
}
