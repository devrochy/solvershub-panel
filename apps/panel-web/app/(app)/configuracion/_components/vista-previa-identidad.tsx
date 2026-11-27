"use client";

import { AlertTriangle, Eye } from "lucide-react";

/**
 * La carta de presentación que ve el cliente, armada con lo que se está editando. No es una captura
 * de WhatsApp: es una vista previa honesta del nombre, la descripción y el estado del asistente.
 */
export function VistaPreviaIdentidad({
  nombre,
  descripcion,
  idioma,
  moneda,
  zona,
  pausado,
  puedeEditar,
  onReactivar,
}: {
  nombre: string;
  descripcion: string;
  idioma: string;
  moneda: string;
  zona: string;
  pausado: boolean;
  puedeEditar: boolean;
  onReactivar: () => void;
}) {
  const nombreVisible = nombre.trim() || "Tu asistente";
  const inicial = nombreVisible.charAt(0).toUpperCase();
  const descripcionVisible = descripcion.trim();
  const saludo = nombre.trim()
    ? `Hola, soy ${nombreVisible}. ¿En qué te ayudo?`
    : "Hola. ¿En qué te ayudo?";

  return (
    <section aria-labelledby="vista-previa-identidad" className="flex flex-col gap-2">
      <h3
        id="vista-previa-identidad"
        className="flex items-center gap-1.5 text-sh-label font-semibold tracking-[0.08em] text-text-soft uppercase"
      >
        <Eye aria-hidden className="h-3.5 w-3.5 text-link" />
        Así te ve tu cliente
      </h3>

      <div className="rounded-lg border border-border-soft bg-surface-2 p-3.5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-focus/40 bg-focus/10 font-display text-sm font-semibold text-link"
          >
            {inicial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-semibold text-headline">{nombreVisible}</p>
            <p className="line-clamp-2 text-xs leading-4 text-text-soft">
              {descripcionVisible || "La descripción de tu negocio aparecerá aquí."}
            </p>
          </div>
        </div>

        <p className="mt-2.5 ml-11 rounded-lg rounded-bl-sm border border-border-soft bg-surface px-3 py-2 text-sm leading-5 text-body">
          {saludo}
        </p>

        <div className="mt-2 ml-11 flex flex-wrap gap-1.5">
          {idioma && (
            <span className="rounded-pill border border-border-soft bg-surface px-2 py-0.5 text-xs text-text-soft">
              {idioma}
            </span>
          )}
          {moneda && (
            <span className="rounded-pill border border-border-soft bg-surface px-2 py-0.5 text-xs text-text-soft">
              {moneda}
            </span>
          )}
          {zona && (
            <span className="rounded-pill border border-border-soft bg-surface px-2 py-0.5 text-xs text-text-soft">
              {zona}
            </span>
          )}
        </div>

        {pausado && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-md border border-status-warning-border bg-status-warning-bg px-2.5 py-2 text-xs leading-4 text-status-warning-fg">
            <AlertTriangle aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1">El asistente está pausado: no responde en ningún canal.</span>
            {puedeEditar && (
              <button
                type="button"
                onClick={onReactivar}
                className="font-semibold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Reactivar
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
