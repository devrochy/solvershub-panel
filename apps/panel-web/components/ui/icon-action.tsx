"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type ActionTone = "ver" | "editar" | "eliminar" | "permisos" | "aprobar" | "neutro";

/** Tonos semánticos (tokens del tema, sin pasteles fijos). */
const TONOS: Record<ActionTone, string> = {
  ver: "text-link hover:bg-border-soft",
  editar: "text-data-2 hover:bg-border-soft",
  eliminar: "text-status-danger-fg hover:bg-border-soft",
  permisos: "text-data-4 hover:bg-border-soft",
  aprobar: "text-status-success-fg hover:bg-border-soft",
  neutro: "text-body hover:bg-border-soft",
};

/** Acción por fila con icono en tono semántico y micro-interacción sobria. */
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
    "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-hover",
    "transition-[background-color,box-shadow] duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
    "motion-reduce:transition-none",
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
