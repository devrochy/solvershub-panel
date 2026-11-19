"use client";

import { useId, type ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Controles de un clic del recorrido del agente: bienvenida, nuevo agente y editar (HU-UX-21, HU-UX-22).
 * Son `input` nativos (radio o checkbox)
 * dentro de una etiqueta: el teclado, las flechas y el lector de pantalla funcionan sin código extra, y la
 * selección se ve por el anillo y la marca, nunca solo por el color.
 *
 * Ruta de lanzamiento (HU-UX-24, SPEC-49): `baldosa` pone el ícono en una baldosa de 44 px, `etiqueta`
 * («Recomendado») va como texto sobre el borde, `razon` dice el porqué y `nota` explica por qué una
 * opción deshabilitada no se puede elegir (el lector la lee con `aria-describedby`); `accion` es un
 * enlace al lado de la nota (por ejemplo «Editar a Laura»), fuera de la etiqueta del radio.
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
  baldosa = false,
  etiqueta,
  razon,
  deshabilitada,
  nota,
  accion,
  className,
}: {
  nombre: string;
  valor: string;
  elegida: boolean;
  onElegir: (valor: string) => void;
  titulo: string;
  ayuda?: string;
  icono?: ReactNode;
  /** El ícono en una baldosa de 44 px (ruta de lanzamiento). */
  baldosa?: boolean;
  /** Texto sobre el borde, por ejemplo «Recomendado». Es texto: nunca solo color. */
  etiqueta?: string;
  /** Por qué se recomienda; va bajo la ayuda. */
  razon?: string;
  deshabilitada?: boolean;
  /** Por qué no se puede elegir (solo con `deshabilitada`); el lector la lee con la opción. */
  nota?: string;
  /** Enlace junto a la nota, fuera de la etiqueta del radio. */
  accion?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const idNota = `${id}-nota`;
  const idRazon = `${id}-razon`;
  const conNota = Boolean(deshabilitada && nota);
  const descritaPor = [conNota && idNota, razon && idRazon].filter(Boolean).join(" ") || undefined;
  const tarjeta = (
    <label
      className={cn(
        "relative flex min-h-[4.5rem] cursor-pointer items-start gap-3 rounded-lg border bg-surface p-4 transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none",
        baldosa && "items-center",
        elegida
          ? "border-focus bg-focus/10 shadow-[0_0_0_1px_var(--sh-focus)]"
          : "border-control-border hover:border-focus/50 hover:bg-focus/5",
        deshabilitada && (conNota ? "cursor-not-allowed border-dashed hover:border-control-border hover:bg-surface" : "cursor-not-allowed opacity-50"),
        etiqueta && "mt-2.5",
        ANILLO,
        !accion && className,
      )}
    >
      <input
        type="radio"
        name={nombre}
        value={valor}
        checked={elegida}
        disabled={deshabilitada}
        onChange={() => onElegir(valor)}
        aria-describedby={descritaPor}
        className="sr-only"
      />
      {etiqueta && (
        <span className="absolute -top-2.5 right-3 rounded-full border border-focus bg-surface px-2 text-xs font-semibold leading-5 text-link">
          {etiqueta}
        </span>
      )}
      {icono && baldosa && (
        <span
          aria-hidden
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-md border",
            elegida ? "border-focus bg-focus text-surface" : "border-border-soft bg-surface-2 text-text-soft",
          )}
        >
          {icono}
        </span>
      )}
      {icono && !baldosa && (
        <span className={cn("mt-0.5 shrink-0", elegida ? "text-focus" : "text-text-soft")} aria-hidden>
          {icono}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("font-display text-[0.95rem] font-semibold", conNota ? "text-body" : "text-headline")}>{titulo}</span>
        {ayuda && !conNota && <span className="text-sm text-body">{ayuda}</span>}
        {conNota && (
          <span id={idNota} className="text-sm text-body">
            {nota}
          </span>
        )}
        {razon && (
          <span id={idRazon} className="text-xs text-text-soft">
            {razon}
          </span>
        )}
      </span>
      {!conNota && (
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
            baldosa && "mt-0",
            elegida ? "border-focus bg-focus text-surface" : "border-control-border text-transparent",
          )}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </label>
  );
  if (!accion) return tarjeta;
  return (
    <div className={cn("relative flex flex-col", className)}>
      {tarjeta}
      <div className="absolute right-4 top-4 text-sm">{accion}</div>
    </div>
  );
}

/**
 * Ficha corta de selección única (grupo de opciones excluyentes). Con `inicial`, la letra va en un
 * círculo delante del texto (ideas de nombre de la ruta de lanzamiento); al elegirla, el círculo pasa a ✓.
 */
export function FichaUnica({
  nombre,
  valor,
  elegida,
  onElegir,
  inicial,
  children,
}: {
  nombre: string;
  valor: string;
  elegida: boolean;
  onElegir: (valor: string) => void;
  inicial?: string;
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
      {inicial !== undefined ? (
        <span
          aria-hidden
          className={cn(
            "-ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold",
            elegida ? "bg-focus text-surface" : "bg-surface-2 text-headline",
          )}
        >
          {elegida ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : inicial}
        </span>
      ) : (
        elegida && <Check className="h-4 w-4 text-focus" strokeWidth={3} aria-hidden />
      )}
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
  unica = false,
  children,
  className,
}: {
  titulo: string;
  ayuda?: string;
  /** Opciones excluyentes: el grupo se anuncia como `radiogroup`. */
  unica?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3" role={unica ? "radiogroup" : undefined}>
      <legend className="font-display text-base font-semibold text-headline">{titulo}</legend>
      {ayuda && <p className="-mt-1 text-sm text-text-soft">{ayuda}</p>}
      <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>
    </fieldset>
  );
}
