"use client";

import { useRef, type KeyboardEvent, type ReactElement } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export type OpcionSegmentada = {
  value: string;
  label: string;
  /** Con `href` en todas las opciones, el control navega: el filtro viaja en la URL. */
  href?: string;
  /**
   * Si viene, la opción se muestra solo con el icono; `label` queda como nombre accesible. Es un
   * elemento ya creado (`<List />`), no el componente: una página de servidor no puede pasarle una
   * función a este componente de cliente (React no la serializa y la página no carga).
   */
  icon?: ReactElement;
};

function ContenidoDeOpcion({ opcion }: { opcion: OpcionSegmentada }) {
  if (!opcion.icon) return <>{opcion.label}</>;
  return (
    <>
      <span aria-hidden className="inline-flex [&>svg]:h-4 [&>svg]:w-4">
        {opcion.icon}
      </span>
      <span className="sr-only">{opcion.label}</span>
    </>
  );
}

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
              title={opcion.icon ? opcion.label : undefined}
              className={cn(OPCION, opcion.icon && "min-w-9 pointer-coarse:min-w-11", activa ? ACTIVA : INACTIVA)}
            >
              <ContenidoDeOpcion opcion={opcion} />
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
            title={opcion.icon ? opcion.label : undefined}
            className={cn(OPCION, opcion.icon && "min-w-9 pointer-coarse:min-w-11", activa ? ACTIVA : INACTIVA)}
          >
            <ContenidoDeOpcion opcion={opcion} />
          </button>
        );
      })}
    </div>
  );
}
