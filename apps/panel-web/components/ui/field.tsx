import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Campo de formulario: etiqueta + control + ayuda/error. Solo presentación. */
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
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-body">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : (
        help && <p className="text-xs text-text-soft">{help}</p>
      )}
    </div>
  );
}
