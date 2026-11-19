"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

/** Un paso de la barra. `marca` dice si tiene cambios sin guardar o algo que revisar. */
export type PasoDeLaBarra = {
  id: string;
  titulo: string;
  /** Nombre corto para la barra y «Paso X de N · {corto}»; sin él, el título. */
  corto?: string;
  marca?: "cambios" | "revisar";
};

const TEXTO_DE_MARCA = { cambios: "con cambios", revisar: "revisar" } as const;

/**
 * Barra de avance de un recorrido por pasos (HU-UX-22). En escritorio son segmentos con su nombre
 * corto; por debajo de `md`, píldoras que se deslizan. `en-orden` solo deja volver a pasos ya
 * recorridos; `libre` deja ir a cualquiera. La marca de cada paso va con texto para el lector de
 * pantalla: el color nunca es lo único que la dice.
 *
 * `forma="estaciones"` es la ruta de lanzamiento (HU-UX-24, SPEC-49): nodos unidos por tramos, con ✓ y
 * «hecho» en las anteriores, `aria-current="step"` en la actual y su número en las que siguen. Por debajo
 * de `md`, una fila de puntos con el actual alargado y «Paso N de M · {corto}». El avance de escritorio
 * lo dice el eyebrow de `RecorridoDelAgente`.
 */
export function BarraDePasos({
  pasos,
  actual,
  modo,
  onIr,
  etiqueta,
  forma = "segmentos",
  className,
}: {
  pasos: readonly PasoDeLaBarra[];
  actual: string;
  modo: "en-orden" | "libre";
  onIr?: (id: string) => void;
  etiqueta: string;
  forma?: "segmentos" | "estaciones";
  className?: string;
}) {
  const indice = Math.max(
    0,
    pasos.findIndex((p) => p.id === actual),
  );
  const pasoActual = pasos[indice];
  const avance = pasoActual ? `Paso ${indice + 1} de ${pasos.length} · ${pasoActual.corto ?? pasoActual.titulo}` : "";

  function puedeIr(i: number): boolean {
    return Boolean(onIr) && i !== indice && (modo === "libre" || i < indice);
  }

  if (forma === "estaciones") {
    return (
      <nav aria-label={etiqueta} className={cn("flex flex-col gap-2", className)}>
        {/* Escritorio: estaciones unidas por tramos. */}
        <ol className="hidden items-start md:flex">
          {pasos.map((paso, i) => (
            <li key={paso.id} className="relative flex min-w-0 flex-1 flex-col items-center">
              {i > 0 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2",
                    i <= indice ? "bg-focus" : "bg-control-border",
                  )}
                />
              )}
              <NodoDeEstacion
                paso={paso}
                numero={i + 1}
                estado={i === indice ? "actual" : i < indice ? "hecha" : "pendiente"}
                onIr={puedeIr(i) ? () => onIr?.(paso.id) : undefined}
              />
            </li>
          ))}
        </ol>
        {/* Móvil: puntos, el actual alargado, y el avance en palabras. */}
        <div className="flex items-center gap-3 md:hidden">
          <ol className="flex shrink-0 items-center gap-1.5">
            {pasos.map((paso, i) => (
              <li key={paso.id} aria-current={i === indice ? "step" : undefined}>
                <span
                  aria-hidden
                  className={cn(
                    "block h-1.5 rounded-full transition-[width] duration-150 motion-reduce:transition-none",
                    i === indice ? "w-6 bg-focus" : i < indice ? "w-1.5 bg-focus" : "w-1.5 bg-control-border",
                  )}
                />
                <span className="sr-only">
                  {paso.corto ?? paso.titulo}
                  {i < indice ? ", hecho" : i === indice ? ", actual" : ""}
                </span>
              </li>
            ))}
          </ol>
          <p className="min-w-0 truncate text-sm text-text-soft" aria-live="polite">
            {avance}
          </p>
        </div>
      </nav>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="text-sm text-text-soft" aria-live="polite">
        {avance}
      </p>
      <nav aria-label={etiqueta}>
        {/* Escritorio: segmentos. */}
        <ol
          className="hidden gap-1.5 md:grid"
          style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}
        >
          {pasos.map((paso, i) => (
            <li key={paso.id} className="min-w-0">
              <Segmento
                paso={paso}
                estado={i === indice ? "actual" : i < indice ? "pasado" : "futuro"}
                onIr={puedeIr(i) ? () => onIr?.(paso.id) : undefined}
              />
            </li>
          ))}
        </ol>
        {/* Móvil: píldoras deslizables. */}
        <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 md:hidden">
          {pasos.map((paso, i) => (
            <li key={paso.id} className="shrink-0">
              <Pildora
                paso={paso}
                numero={i + 1}
                actual={i === indice}
                onIr={puedeIr(i) ? () => onIr?.(paso.id) : undefined}
              />
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}

/** El punto de color; el texto de la marca va después del nombre, con `TextoDeMarca`. */
function Punto({ marca }: { marca?: PasoDeLaBarra["marca"] }) {
  if (!marca) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
        marca === "revisar" ? "bg-status-danger-fg" : "bg-status-warning-fg",
      )}
    />
  );
}

function TextoDeMarca({ marca }: { marca?: PasoDeLaBarra["marca"] }) {
  return marca ? <span className="sr-only">, {TEXTO_DE_MARCA[marca]}</span> : null;
}

function Segmento({
  paso,
  estado,
  onIr,
}: {
  paso: PasoDeLaBarra;
  estado: "actual" | "pasado" | "futuro";
  onIr?: () => void;
}) {
  const contenido = (
    <>
      <span
        aria-hidden
        className={cn(
          "block h-1 rounded-full transition-colors duration-150 motion-reduce:transition-none",
          estado === "actual" ? "bg-focus" : estado === "pasado" ? "bg-data-single" : "bg-border-strong",
        )}
      />
      <span className="flex min-w-0 items-center gap-1.5 text-xs">
        <Punto marca={paso.marca} />
        <span
          className={cn("truncate", estado === "actual" ? "font-semibold text-headline" : "text-body")}
          title={paso.titulo}
        >
          {paso.corto ?? paso.titulo}
        </span>
        <TextoDeMarca marca={paso.marca} />
      </span>
    </>
  );
  const clase = "flex min-h-9 w-full min-w-0 flex-col gap-1.5 rounded-sm text-left";
  if (!onIr) {
    return (
      <span className={clase} aria-current={estado === "actual" ? "step" : undefined}>
        {contenido}
      </span>
    );
  }
  return (
    <button type="button" onClick={onIr} className={cn(clase, "cursor-pointer hover:opacity-80")}>
      {contenido}
    </button>
  );
}

function Pildora({
  paso,
  numero,
  actual,
  onIr,
}: {
  paso: PasoDeLaBarra;
  numero: number;
  actual: boolean;
  onIr?: () => void;
}) {
  const clase = cn(
    "inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs",
    actual ? "bg-focus font-semibold text-surface" : "bg-surface-2 text-headline",
  );
  const contenido = (
    <>
      <Punto marca={paso.marca} />
      {numero} {paso.corto ?? paso.titulo}
      <TextoDeMarca marca={paso.marca} />
    </>
  );
  if (!onIr) {
    return (
      <span className={clase} aria-current={actual ? "step" : undefined}>
        {contenido}
      </span>
    );
  }
  return (
    <button type="button" onClick={onIr} className={clase}>
      {contenido}
    </button>
  );
}

/** Un nodo de la ruta de estaciones: ✓ y «hecho» (texto) en las hechas, anillo en la actual, número en las pendientes. */
function NodoDeEstacion({
  paso,
  numero,
  estado,
  onIr,
}: {
  paso: PasoDeLaBarra;
  numero: number;
  estado: "hecha" | "actual" | "pendiente";
  onIr?: () => void;
}) {
  const contenido = (
    <>
      <span
        aria-hidden
        className={cn(
          "relative flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-bold transition-colors duration-150 motion-reduce:transition-none",
          estado === "hecha" && "bg-focus text-surface",
          estado === "actual" &&
            "border-2 border-focus bg-surface text-headline shadow-[0_0_0_5px_color-mix(in_oklab,var(--sh-focus)_16%,transparent)]",
          estado === "pendiente" && "border border-control-border bg-surface text-text-soft",
        )}
      >
        {estado === "hecha" ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : numero}
      </span>
      <span
        className={cn(
          "max-w-[7.5rem] text-center text-xs leading-tight",
          estado === "actual" ? "font-semibold text-headline" : "text-body",
        )}
      >
        {paso.corto ?? paso.titulo}
        <span className="sr-only">{estado === "hecha" ? ", hecho" : estado === "actual" ? ", actual" : ""}</span>
        <TextoDeMarca marca={paso.marca} />
      </span>
    </>
  );
  const clase = "relative flex min-h-11 flex-col items-center gap-1.5 rounded-sm px-1";
  if (!onIr) {
    return (
      <span className={clase} aria-current={estado === "actual" ? "step" : undefined}>
        {contenido}
      </span>
    );
  }
  return (
    <button type="button" onClick={onIr} className={cn(clase, "cursor-pointer hover:opacity-80")}>
      {contenido}
    </button>
  );
}
