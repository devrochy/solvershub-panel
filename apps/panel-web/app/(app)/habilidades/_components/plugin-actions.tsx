"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { useAction } from "@/lib/use-action";

/**
 * Acciones de una habilidad en el negocio. Desde ADR-0206 (HU-AOS-91) no hay interruptor a
 * nivel negocio: la habilidad es del negocio cuando algún agente activo la tiene instalada.
 * Aquí solo se reintenta su salud si falló; si no está habilitada, se explica dónde instalarla.
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
  const { run, pending } = useAction();

  async function reintentar() {
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, status: res.status, error: json.error };
    return { ok: true, success: "Salud reiniciada. Si vuelve a fallar, revisa su configuración." };
  }

  if (enabled && !hasError) return null;

  return (
    <div className="flex items-start gap-3">
      {!enabled && (
        <p className="text-sm text-body">
          Se instala en el agente que la usa, por ejemplo al crear un agente desde una plantilla.{" "}
          <Link className="text-link underline underline-offset-2" href="/agentes">
            Ir a Agentes
          </Link>
        </p>
      )}
      {hasError && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="ml-auto shrink-0"
          onClick={() => void run(reintentar)}
          disabled={pending}
        >
          Reintentar
        </Button>
      )}
    </div>
  );
}
