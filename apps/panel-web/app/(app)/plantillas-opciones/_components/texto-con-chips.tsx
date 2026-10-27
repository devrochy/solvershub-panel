"use client";

import { useId, useRef } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { OpcionesHallazgo } from "@/lib/api/types";
import { contar, insertarEn } from "@/lib/plantillas-opciones";
import { cn } from "@/lib/utils";

import { MensajesDeCampo } from "./mensajes-de-campo";

export type ChipDeTexto = { etiqueta: string; texto: string; ayuda?: string };

/**
 * Área de texto con contador de caracteres y chips que insertan una variable (`{cliente.nombre}`) donde
 * está el cursor (HU-OPC-06). El conteo es el del backend (un emoji cuenta uno).
 */
export function TextoConChips({
  label,
  value,
  onChange,
  max,
  chips = [],
  chipsLabel = "Insertar dato",
  rows = 4,
  disabled,
  hallazgos = [],
  help,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  max: number;
  chips?: ChipDeTexto[];
  chipsLabel?: string;
  rows?: number;
  disabled?: boolean;
  hallazgos?: readonly OpcionesHallazgo[];
  help?: string;
  placeholder?: string;
}) {
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const total = contar(value);
  const excedido = total > max;
  const conError = hallazgos.some((h) => h.severity === "error") || excedido;

  function insertar(texto: string) {
    const el = area.current;
    const { valor, cursor } = insertarEn(value, texto, el?.selectionStart ?? undefined, el?.selectionEnd ?? undefined);
    onChange(valor);
    // El cursor queda después de lo insertado, también tras el re-render.
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[13px] font-medium text-body">
          {label}
        </label>
        <span
          id={`${id}-conteo`}
          className={cn("text-xs tabular-nums", excedido ? "font-medium text-status-danger-fg" : "text-text-soft")}
        >
          {total}/{max}
          <span className="sr-only"> caracteres</span>
        </span>
      </div>
      <Textarea
        id={id}
        ref={area}
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={conError || undefined}
        aria-describedby={`${id}-conteo ${hallazgos.length ? `${id}-mensajes` : ""} ${help ? `${id}-ayuda` : ""}`.trim()}
        onChange={(e) => onChange(e.target.value)}
      />
      {chips.length > 0 && !disabled && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={chipsLabel}>
          <span className="text-xs text-text-soft">{chipsLabel}:</span>
          {chips.map((chip) => (
            <button
              key={chip.texto}
              type="button"
              title={chip.ayuda ?? chip.texto}
              onClick={() => insertar(chip.texto)}
              className="rounded-pill border border-control-border bg-surface-2 px-2.5 py-1 text-xs text-headline transition-colors hover:border-focus/60 hover:bg-focus/10"
            >
              {chip.etiqueta}
            </button>
          ))}
        </div>
      )}
      {help && (
        <p id={`${id}-ayuda`} className="text-xs text-text-soft">
          {help}
        </p>
      )}
      <MensajesDeCampo hallazgos={hallazgos} id={`${id}-mensajes`} />
    </div>
  );
}
