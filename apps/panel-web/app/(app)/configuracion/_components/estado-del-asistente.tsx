"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

/**
 * La pausa del asistente, con su consecuencia a la vista. Pausar pide confirmación porque deja al
 * negocio sin respuestas en todos los canales; reactivar es inmediato y no interrumpe nada.
 */
export function EstadoDelAsistente({
  pausado,
  puedeEditar,
  onChange,
}: {
  pausado: boolean;
  puedeEditar: boolean;
  onChange: (pausado: boolean) => void;
}) {
  const [confirmando, setConfirmando] = useState(false);

  function alCambiar(activo: boolean) {
    if (!puedeEditar) return;
    if (activo) {
      setConfirmando(true);
      return;
    }
    onChange(false);
  }

  return (
    <section aria-labelledby="estado-asistente" className="flex flex-col gap-3">
      <div>
        <h3 id="estado-asistente" className="text-sm font-semibold text-headline">
          Estado del asistente
        </h3>
        <p className="text-sh-label text-text-soft">
          La pausa detiene las respuestas en todos los canales. Las conversaciones siguen entrando a la bandeja.
        </p>
      </div>

      <div
        className={
          pausado
            ? "flex items-center gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-2.5"
            : "flex items-center gap-3 rounded-lg border border-border-soft bg-surface-2 px-3 py-2.5"
        }
      >
        <span
          aria-hidden
          className={
            pausado
              ? "h-2 w-2 shrink-0 rounded-full bg-status-warning-fg"
              : "h-2 w-2 shrink-0 rounded-full bg-status-success-fg"
          }
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-headline">{pausado ? "Pausado" : "Activo"}</p>
          <p className="text-xs leading-4 text-text-soft">
            {pausado
              ? "No responde en ningún canal hasta que lo reactives."
              : "Responde en todos los canales del negocio."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-text-soft">{pausado ? "Reactivar" : "Pausar"}</span>
          <Switch
            checked={pausado}
            tone={pausado ? "warning" : "success"}
            disabled={!puedeEditar}
            onCheckedChange={alCambiar}
            aria-label={pausado ? "Reactivar el asistente" : "Pausar el asistente"}
          />
        </div>
      </div>

      {confirmando && (
        <div role="alert" className="rounded-lg border border-status-warning-border bg-status-warning-bg px-3 py-3">
          <p className="text-sm leading-5 text-status-warning-fg">
            ¿Pausar el asistente? Dejará de responder en todos los canales hasta que lo reactives. Las
            conversaciones siguen entrando a la bandeja.
          </p>
          <div className="mt-2.5 flex justify-end gap-2">
            <Button type="button" size="sm" variant="ghost" autoFocus onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="danger"
              onClick={() => {
                setConfirmando(false);
                onChange(true);
              }}
            >
              Sí, pausar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
