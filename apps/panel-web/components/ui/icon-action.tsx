"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type ActionTone = "ver" | "editar" | "eliminar" | "permisos" | "aprobar" | "neutro";

const TONOS: Record<ActionTone, string> = {
  ver: "bg-sky-100 text-sky-700 hover:bg-sky-200",
  editar: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  eliminar: "bg-rose-100 text-rose-700 hover:bg-rose-200",
  permisos: "bg-violet-100 text-violet-700 hover:bg-violet-200",
  aprobar: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
  neutro: "bg-slate-100 text-slate-700 hover:bg-slate-200",
};

/** Acción por fila con icono pastel y micro-interacción (hover/focus). */
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
    "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-[transform,background-color,box-shadow] duration-150",
    "hover:scale-105 hover:shadow-sm focus-visible:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
    "motion-reduce:transition-none motion-reduce:hover:scale-100",
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
