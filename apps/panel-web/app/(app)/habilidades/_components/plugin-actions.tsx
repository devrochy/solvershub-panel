"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Switch } from "@/components/ui/switch";

/** Habilita/deshabilita una habilidad, o reintenta su salud si falló. */
export function PluginActions({
  pluginId,
  enabled,
  hasError,
}: {
  pluginId: string;
  enabled: boolean;
  hasError: boolean;
}) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [confirming, setConfirming] = useState(false);
  const [state, setState] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function run(action: "activate" | "deactivate" | "retry") {
    setState({ loading: true });
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setState({ error: json.error ?? "No se pudo completar la acción." });
      return;
    }
    setState({ success: "Listo." });
    router.refresh();
  }

  function onToggle(checked: boolean) {
    setState({});
    if (checked) {
      setIsEnabled(true);
      void run("activate");
      return;
    }
    setConfirming(true);
  }

  function confirmDeactivate() {
    setConfirming(false);
    setIsEnabled(false);
    void run("deactivate");
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Switch
          checked={isEnabled}
          onCheckedChange={onToggle}
          disabled={state.loading}
          aria-label={isEnabled ? `Deshabilitar ${pluginId}` : `Habilitar ${pluginId}`}
        />
        <span className="text-sm text-body">{isEnabled ? "Habilitada" : "No habilitada"}</span>
        {hasError && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => void run("retry")}
            disabled={state.loading}
          >
            Reintentar
          </Button>
        )}
      </div>

      <FormFeedback error={state.error} success={state.success} />

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
