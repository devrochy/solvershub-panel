import * as React from "react";
import { cva } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium tracking-wide",
  {
    variants: {
      variant: {
        neutral: "bg-hover text-body",
        info: "bg-status-info-bg text-status-info-fg",
        success: "bg-status-success-bg text-status-success-fg",
        warning: "bg-status-warning-bg text-status-warning-fg",
        danger: "bg-status-danger-bg text-status-danger-fg",
        accent: "bg-accent/12 text-link",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type TonoDeEstado = "info" | "success" | "warning" | "danger";

/** Ícono por defecto de cada estado: el color nunca va solo (DESIGN.md · Accesibilidad). */
const ICONO_DE_ESTADO: Record<TonoDeEstado, React.ReactElement> = {
  info: <Info aria-hidden className="h-3 w-3" />,
  success: <CheckCircle2 aria-hidden className="h-3 w-3" />,
  warning: <AlertTriangle aria-hidden className="h-3 w-3" />,
  danger: <XCircle aria-hidden className="h-3 w-3" />,
};

type Base = Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & { children?: React.ReactNode };

/**
 * Con tono de estado el ícono es obligatorio: si no se pasa, va el del estado, y el tipo
 * no deja quitarlo (`icon={null}` no compila). Los tonos neutros lo aceptan opcional.
 */
export type BadgeProps =
  | (Base & { variant?: "neutral" | "accent" | null; icon?: React.ReactNode })
  | (Base & { variant: TonoDeEstado; icon?: React.ReactElement });

export function Badge({ className, variant, icon, children, ...props }: BadgeProps) {
  const iconoFinal = icon ?? (variant && variant in ICONO_DE_ESTADO ? ICONO_DE_ESTADO[variant as TonoDeEstado] : null);
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {iconoFinal}
      {children}
    </span>
  );
}
