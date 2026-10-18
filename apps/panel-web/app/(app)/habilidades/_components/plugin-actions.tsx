"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { mensajeDeHabilitacion } from "@/lib/habilidades";
import { useAction } from "@/lib/use-action";

/**
 * Habilita/deshabilita una habilidad, o reintenta su salud si falló. El interruptor se mueve
 * en optimista y vuelve al estado real si la API no acepta el cambio (por ejemplo, al tope
 * de habilidades del plan), con el motivo en un aviso.
 */
export function PluginActions({
  pluginId,
  enabled,
  hasError,
}: {
  pluginId: string;
  enabled: boolean;
  hasError: boolean;
}) {
  // Estado optimista mientras la API responde; `null` = lo que dice el servidor.
  const [optimista, setOptimista] = useState<boolean | null>(null);
  // Cuando el servidor trae un valor nuevo (tras refrescar), el optimista ya no manda.
  const [enabledVisto, setEnabledVisto] = useState(enabled);
  if (enabledVisto !== enabled) {
    setEnabledVisto(enabled);
    setOptimista(null);
  }
  const isEnabled = optimista ?? enabled;
  const [confirming, setConfirming] = useState(false);
  const { run, pending } = useAction({ rollback: () => setOptimista(null) });

  async function accion(action: "activate" | "deactivate" | "retry", success: string) {
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: action === "activate" ? mensajeDeHabilitacion(json.error, res.status) : json.error,
      };
    }
    return { ok: true, success };
  }

  function onToggle(checked: boolean) {
    if (checked) {
      setOptimista(true);
      void run(() => accion("activate", "Habilidad habilitada."));
      return;
    }
    setConfirming(true);
  }

  function confirmDeactivate() {
    setConfirming(false);
    setOptimista(false);
    void run(() => accion("deactivate", "Habilidad deshabilitada."));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
          disabled={pending}
          aria-label={isEnabled ? `Deshabilitar ${pluginId}` : `Habilitar ${pluginId}`}
        />
        <span className="text-sm text-body">{isEnabled ? "Habilitada" : "No habilitada"}</span>
        {hasError && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => void run(() => accion("retry", "Salud reiniciada. Si vuelve a fallar, revisa su configuración."))}
            disabled={pending}
          >
            Reintentar
          </Button>
        )}
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent
          title="Deshabilitar habilidad"
          description="El agente dejará de usarla en este negocio."
        >
          <p className="text-sm text-body">
            Volver a habilitarla depende del límite de habilidades de tu plan: si ya estás en el
            tope, puede que necesites mejorar el plan para reactivarla.
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" aria-label="Cancelar" size="icon" title="Cancelar" variant="outline"><X className="h-4 w-4" aria-hidden /></Button>
            </DialogClose>
            <Button type="button" variant="danger" onClick={confirmDeactivate}>
              Deshabilitar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
