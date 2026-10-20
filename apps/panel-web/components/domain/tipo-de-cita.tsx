"use client";

import * as RadioPrimitive from "@radix-ui/react-radio-group";

import { COLORES_TIPO, FONDO_DE_COLOR, codigoPorDefecto, esColorTipo, type TipoLeyenda } from "@/lib/calendario/agenda";
import { cn } from "@/lib/utils";

/** Muestra del color de un tipo de cita (paleta categórica, nunca hex libre). */
export function MuestraDeColor({ color, className }: { color: string | null | undefined; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-3 w-3 shrink-0 rounded-full", esColorTipo(color) ? FONDO_DE_COLOR[color] : "bg-border-strong", className)}
    />
  );
}

/** Color y código de un tipo: el código va en texto para que el color nunca vaya solo. */
export function EtiquetaDeTipo({ tipo }: { tipo: Pick<TipoLeyenda, "name" | "color" | "codigo"> }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-body">
      <MuestraDeColor color={tipo.color} />
      <span className="font-mono text-xs font-semibold text-headline">{tipo.codigo || codigoPorDefecto(tipo.name)}</span>
      <span>{tipo.name}</span>
    </span>
  );
}

/** Leyenda de tipos de cita arriba del calendario (HU-UX-08). */
export function LeyendaDeTipos({ tipos }: { tipos: TipoLeyenda[] }) {
  if (!tipos.length) return null;
  return (
    <ul aria-label="Tipos de cita" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {tipos.map((t) => (
        <li key={t.id}>
          <EtiquetaDeTipo tipo={t} />
        </li>
      ))}
      <li className="inline-flex items-center gap-1.5 text-sm text-body">
        <span aria-hidden className="inline-block h-3 w-5 rounded-sm border border-dashed border-border-strong bg-surface-2" />
        Bloqueo
      </li>
    </ul>
  );
}

/** Elige el color de un tipo entre las 4 opciones de la paleta (flechas para moverse). */
export function SelectorDeColor({
  name,
  defaultValue,
  idBase,
}: {
  name: string;
  defaultValue?: string | null;
  idBase: string;
}) {
  const inicial = esColorTipo(defaultValue) ? defaultValue : undefined;
  return (
    <RadioPrimitive.Root
      aria-label="Color"
      name={name}
      defaultValue={inicial}
      orientation="horizontal"
      className="flex items-center gap-2"
    >
      {COLORES_TIPO.map((c) => (
        <RadioPrimitive.Item
          key={c.valor}
          id={`${idBase}-${c.valor}`}
          value={c.valor}
          aria-label={c.nombre}
          title={c.nombre}
          className={cn(
            "h-7 w-7 rounded-full border-2 border-surface outline-offset-2 ring-1 ring-border",
            "data-[state=checked]:ring-2 data-[state=checked]:ring-focus focus-visible:outline-2 focus-visible:outline-focus",
            FONDO_DE_COLOR[c.valor],
          )}
        >
          <RadioPrimitive.Indicator className="block h-full w-full rounded-full border-2 border-surface" />
        </RadioPrimitive.Item>
      ))}
    </RadioPrimitive.Root>
  );
}
