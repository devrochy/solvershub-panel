"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type ActionTone = "ver" | "editar" | "eliminar" | "permisos" | "aprobar" | "neutro";

/**
 * Tonos semánticos. En reposo solo el icono; al pasar el cursor el botón toma su mismo color
 * pero más oscuro (relleno del tono + icono atenuado) y un anillo, para saber que estamos encima.
 */
const TONOS: Record<ActionTone, string> = {
  ver: "text-link hover:bg-link/30 hover:ring-link/40",
  editar: "text-data-2 hover:bg-data-2/30 hover:ring-data-2/40",
  eliminar: "text-status-danger-fg hover:bg-status-danger-fg/30 hover:ring-status-danger-fg/40",
  permisos: "text-data-4 hover:bg-data-4/30 hover:ring-data-4/40",
  aprobar: "text-status-success-fg hover:bg-status-success-fg/30 hover:ring-status-success-fg/40",
  neutro: "text-body hover:bg-body/25 hover:ring-body/30",
};

/**
 * Acción por fila con icono en tono semántico. En reposo es solo el icono; al pasar el cursor
 * aparece su color más oscuro, un anillo y una leve elevación. Al pulsar se hunde.
 */
export function IconAction({
  tone = "neutro",
  label,
  children,
  onClick,
  href,
  disabled,
}: {
  tone?: ActionTone;
  label: string;
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  const clases = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 ring-transparent",
    "transition-[background-color,color,box-shadow,transform,filter] duration-200 ease-out",
    "hover:-translate-y-0.5 hover:brightness-90",
    "active:translate-y-0 active:scale-95",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
    "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
    disabled && "pointer-events-none opacity-50",
    TONOS[tone],
  );
  if (href) {
    return (
      <Link aria-label={label} className={clases} href={href} title={label}>
        {children}
      </Link>
    );
  }
  return (
    <button
      aria-label={label}
      className={clases}
      disabled={disabled}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  );
}
