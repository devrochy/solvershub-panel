"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

import { Marca } from "@/components/ui/marca";
import { cn } from "@/lib/utils";

import { InicialDelAgente } from "./escenario-piezas";

/**
 * Escenario a pantalla completa de la bienvenida (HU-UX-24, D-SPEC-49-7): columna de 500 px a la
 * izquierda, siempre oscura, con el logo real arriba, lo que el agente gana en esta estación (`titulo`,
 * `bajada`, `destacado` y el contenido) y la leyenda abajo. Las órbitas son decorativas (`aria-hidden`).
 * Va en `domain` porque habla del agente; en el celular se usa `FranjaDelEscenario`.
 */
export function EscenarioPantallaCompleta({
  titulo,
  bajada,
  destacado,
  leyenda,
  children,
  className,
}: {
  titulo: string;
  bajada?: string;
  /** A la izquierda del título: el anillo de «listo» o la inicial del agente. */
  destacado?: ReactNode;
  /** Línea al pie, por ejemplo «Es una vista previa: no le escribe a nadie». */
  leyenda?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <aside
      data-theme="sh-dark"
      aria-label="Lo que gana tu agente"
      className={cn("relative flex w-full flex-col gap-6 overflow-hidden bg-escena px-10 py-8 text-escena-texto lg:w-[500px]", className)}
    >
      <Orbitas />
      <Marca pieza="horizontal" sobreOscuro className="relative h-10 w-auto self-start" />
      <div className="relative flex items-center gap-4">
        {destacado}
        <div className="min-w-0">
          <p className="font-display text-xl font-bold leading-tight">{titulo}</p>
          {bajada && <p className="mt-1 text-sm text-escena-texto-suave">{bajada}</p>}
        </div>
      </div>
      {children && <div className="relative flex min-h-0 flex-1 flex-col gap-3">{children}</div>}
      {leyenda && <p className="relative mt-auto text-center text-sm text-escena-texto-suave">{leyenda}</p>}
    </aside>
  );
}

/**
 * La franja del escenario en el celular: logo (bienvenida) o ✕ con «Nuevo agente · N de 5», y una línea
 * con lo que gana el agente. Siempre oscura.
 */
export function FranjaDelEscenario({
  agente,
  titulo,
  bajada,
  cerrar,
  rotulo,
  extremo,
  className,
}: {
  agente: string;
  titulo: string;
  bajada?: string;
  /** Con `cerrar` se muestra ✕ («Cerrar») y `rotulo` en lugar del logo (Nuevo agente). */
  cerrar?: () => void;
  rotulo?: string;
  /** A la derecha de la fila superior, por ejemplo «Seguir después». */
  extremo?: ReactNode;
  className?: string;
}) {
  return (
    <header data-theme="sh-dark" className={cn("relative flex flex-col gap-3 overflow-hidden bg-escena px-4 pb-4 pt-3 text-escena-texto", className)}>
      <div className="relative flex min-h-11 items-center justify-between gap-3">
        {cerrar ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className="-ml-2 flex h-11 w-11 items-center justify-center rounded-md text-escena-acento hover:bg-escena-tarjeta"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
            {rotulo && <p className="font-display text-sm font-semibold">{rotulo}</p>}
          </div>
        ) : (
          <Marca pieza="horizontal-simple" sobreOscuro className="h-7 w-auto" />
        )}
        {extremo}
      </div>
      <div className="relative flex items-center gap-3">
        <InicialDelAgente nombre={agente} className="h-10 w-10 text-sm ring-2 ring-escena-acento" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold">{titulo}</p>
          {bajada && <p className="text-xs text-escena-texto-suave">{bajada}</p>}
        </div>
      </div>
    </header>
  );
}

/** Órbitas y nodos del fondo: puro adorno, sin texto. */
function Orbitas() {
  return (
    <svg aria-hidden viewBox="0 0 500 844" preserveAspectRatio="xMidYMid slice" className="pointer-events-none absolute inset-0 h-full w-full">
      <g fill="none" className="stroke-escena-tarjeta" strokeWidth="1.5">
        <circle cx="250" cy="470" r="210" />
        <circle cx="250" cy="470" r="320" />
      </g>
      <g className="fill-escena-acento">
        <circle cx="44" cy="250" r="3" />
        <circle cx="462" cy="292" r="3" />
        <circle cx="458" cy="742" r="3" />
        <circle cx="40" cy="690" r="2.5" />
      </g>
    </svg>
  );
}
