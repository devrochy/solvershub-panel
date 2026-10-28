"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Controles de un clic del asistente de primer uso (HU-UX-21). Son `input` nativos (radio o checkbox)
 * dentro de una etiqueta: el teclado, las flechas y el lector de pantalla funcionan sin código extra, y la
 * selección se ve por el anillo y la marca, nunca solo por el color.
 */

const ANILLO =
  "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus";

export function TarjetaElegible({
  nombre,
  valor,
  elegida,
  onElegir,
  titulo,
  ayuda,
  icono,
  deshabilitada,
  className,
}: {
  nombre: string;
  valor: string;
  elegida: boolean;
  onElegir: (valor: string) => void;
  titulo: string;
  ayuda?: string;
  icono?: ReactNode;
  deshabilitada?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "relative flex min-h-[4.5rem] cursor-pointer items-start gap-3 rounded-lg border bg-surface p-4 transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none",
        elegida
          ? "border-focus bg-focus/10 shadow-[0_0_0_1px_var(--sh-focus)]"
          : "border-control-border hover:border-focus/50 hover:bg-focus/5",
        deshabilitada && "cursor-not-allowed opacity-50",
        ANILLO,
        className,
      )}
    >
      <input
        type="radio"
        name={nombre}
        value={valor}
        checked={elegida}
        disabled={deshabilitada}
        onChange={() => onElegir(valor)}
        className="sr-only"
      />
      {icono && (
        <span className={cn("mt-0.5 shrink-0", elegida ? "text-focus" : "text-text-soft")} aria-hidden>
          {icono}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-display text-[0.95rem] font-semibold text-headline">{titulo}</span>
        {ayuda && <span className="text-sm text-body">{ayuda}</span>}
      </span>
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          elegida ? "border-focus bg-focus text-surface" : "border-control-border text-transparent",
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    </label>
  );
}

/** Ficha corta de selección única (grupo de opciones excluyentes). */
export function FichaUnica({
  nombre,
  valor,
  elegida,
  onElegir,
  children,
}: {
  nombre: string;
  valor: string;
  elegida: boolean;
  onElegir: (valor: string) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors motion-reduce:transition-none",
        elegida ? "border-focus bg-focus/15 text-headline" : "border-control-border text-body hover:border-focus/50",
        ANILLO,
      )}
    >
      <input type="radio" name={nombre} value={valor} checked={elegida} onChange={() => onElegir(valor)} className="sr-only" />
      {elegida && <Check className="h-4 w-4 text-focus" strokeWidth={3} aria-hidden />}
      {children}
    </label>
  );
}

/** Ficha de selección múltiple (varias a la vez). */
export function FichaMultiple({
  elegida,
  onCambiar,
  children,
}: {
  elegida: boolean;
  onCambiar: (elegida: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors motion-reduce:transition-none",
        elegida ? "border-focus bg-focus/15 text-headline" : "border-control-border text-body hover:border-focus/50",
        ANILLO,
      )}
    >
      <input type="checkbox" checked={elegida} onChange={(e) => onCambiar(e.target.checked)} className="sr-only" />
      {elegida && <Check className="h-4 w-4 text-focus" strokeWidth={3} aria-hidden />}
      {children}
    </label>
  );
}

/** Grupo con nombre accesible y una línea de ayuda opcional. */
export function GrupoDeOpciones({
  titulo,
  ayuda,
  children,
  className,
}: {
  titulo: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3">
      <legend className="font-display text-base font-semibold text-headline">{titulo}</legend>
      {ayuda && <p className="-mt-1 text-sm text-text-soft">{ayuda}</p>}
      <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>
    </fieldset>
  );
}
