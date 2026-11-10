"use client";

import { useRef, type KeyboardEvent } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type OpcionSegmentada = {
  value: string;
  label: string;
  /** Con `href` en todas las opciones, el control navega: el filtro viaja en la URL. */
  href?: string;
};

const PISTA = "grid grid-flow-col auto-cols-fr gap-0.5 rounded-md border border-border-soft bg-bg-deep p-[3px]";

/** 36 px en total con mouse y 48 px con puntero táctil (28 y 40 px por opción). */
const OPCION =
  "flex h-7 min-w-0 items-center justify-center rounded-[9px] px-2 text-sh-label whitespace-nowrap transition-colors duration-150 pointer-coarse:h-10 focus-visible:outline-2 focus-visible:outline-offset-1";

const ACTIVA = "bg-surface-raised text-headline ring-1 ring-inset ring-border";
const INACTIVA = "text-body hover:bg-hover hover:text-headline";

/**
 * De 2 a 5 opciones excluyentes que cambian lo que se ve en la misma página. Con botones
 * (`aria-pressed`, ← → mueven el foco) o como enlaces (`href` + `aria-current`).
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string;
  options: OpcionSegmentada[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const pistaRef = useRef<HTMLDivElement>(null);

  if (options.every((opcion) => opcion.href)) {
    return (
      <nav aria-label={label} className={cn(PISTA, className)}>
        {options.map((opcion) => {
          const activa = opcion.value === value;
          return (
            <Link
              key={opcion.value || "todas"}
              href={opcion.href as string}
              aria-current={activa ? "page" : undefined}
              className={cn(OPCION, activa ? ACTIVA : INACTIVA)}
            >
              {opcion.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  function moverFoco(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const botones = Array.from(pistaRef.current?.querySelectorAll("button") ?? []);
    const actual = botones.indexOf(document.activeElement as HTMLButtonElement);
    if (actual < 0) return;
    e.preventDefault();
    const paso = e.key === "ArrowRight" ? 1 : -1;
    botones[(actual + paso + botones.length) % botones.length]?.focus();
  }

  return (
    <div ref={pistaRef} role="group" aria-label={label} onKeyDown={moverFoco} className={cn(PISTA, className)}>
      {options.map((opcion) => {
        const activa = opcion.value === value;
        return (
          <button
            key={opcion.value || "todas"}
            type="button"
            aria-pressed={activa}
            onClick={() => onChange?.(opcion.value)}
            className={cn(OPCION, activa ? ACTIVA : INACTIVA)}
          >
            {opcion.label}
          </button>
        );
      })}
    </div>
  );
}
