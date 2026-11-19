import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { inicialDe } from "@/lib/ruta-de-lanzamiento";
import { cn } from "@/lib/utils";

/*
 * Piezas del escenario de la ruta de lanzamiento (HU-UX-24, D-SPEC-49-7). El escenario es siempre
 * oscuro (tokens `escena-*`, alias de los primitivos navy): sus tarjetas son sólidas, sin transparencia
 * detrás del texto, y el estado de cada una va con ✓ y palabra, nunca solo con el color del borde.
 */

/** Lo que el agente ya ganó (hecha) o le falta (pendiente) en esta estación. */
export function TarjetaDelEscenario({
  etiqueta,
  valor,
  hecha,
  className,
}: {
  etiqueta: string;
  valor: ReactNode;
  hecha: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-[0.875rem] bg-escena-tarjeta p-3 text-escena-texto",
        hecha ? "border border-escena-borde/40" : "border border-dashed border-escena-borde-pendiente",
        className,
      )}
    >
      <p className="flex items-center gap-1.5 text-xs text-escena-texto-suave">
        {hecha ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-escena-acento" strokeWidth={3} aria-hidden />
        ) : (
          <span aria-hidden className="h-3.5 w-3.5 shrink-0 rounded-full border border-escena-borde-pendiente" />
        )}
        {etiqueta}
        <span className="sr-only">{hecha ? " (listo)" : " (pendiente)"}</span>
      </p>
      <p className="font-display text-sm font-semibold leading-snug">{valor}</p>
    </div>
  );
}

/** Anillo de «listo para responder»: cuántas cosas tiene el agente sobre el total, con la cifra en texto. */
export function AnilloDeListo({ hechas, total, className }: { hechas: number; total: number; className?: string }) {
  const r = 30;
  const largo = 2 * Math.PI * r;
  const parte = total > 0 ? Math.min(1, Math.max(0, hechas / total)) : 0;
  return (
    <div className={cn("relative h-20 w-20 shrink-0", className)}>
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="6" className="stroke-escena-tarjeta" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={largo}
          strokeDashoffset={largo * (1 - parte)}
          className="stroke-escena-acento transition-[stroke-dashoffset] duration-150 motion-reduce:transition-none"
        />
      </svg>
      <p className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-escena-texto">
        {hechas}/{total}
        <span className="sr-only"> listo</span>
      </p>
    </div>
  );
}

/** El agente en el escenario: inicial en círculo, su nombre y, opcional, una etiqueta («Sugerido»). */
export function PildoraDelAgente({ nombre, etiqueta, className }: { nombre: string; etiqueta?: string; className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-escena-borde/40 bg-escena-tarjeta py-1 pl-1 pr-3 text-sm font-semibold text-escena-texto",
        className,
      )}
    >
      <InicialDelAgente nombre={nombre} />
      {nombre || "Tu agente"}
      {etiqueta && (
        <span className="rounded-full border border-escena-acento px-2 text-xs font-semibold leading-5 text-escena-acento">
          {etiqueta}
        </span>
      )}
    </p>
  );
}

export function InicialDelAgente({ nombre, className }: { nombre: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cta font-display text-xs font-bold text-white",
        className,
      )}
    >
      {inicialDe(nombre) || "·"}
    </span>
  );
}
