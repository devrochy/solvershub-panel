"use client";

import { useEffect, useState } from "react";

import { Switch } from "@/components/ui/switch";
import type { EstadoAliados } from "@/lib/aliados";
import { formatDate } from "@/lib/format";
import { useAction } from "@/lib/use-action";

type Lectura = { estado: EstadoAliados } | { error: string };

async function leer(url: string): Promise<Lectura> {
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as EstadoAliados & { error?: string };
  return res.ok ? { estado: json } : { error: json.error ?? "No se pudo leer si el negocio tiene aliados." };
}

/** Aliados (proveedores) del negocio (HU-CRM-03): solo el master los enciende o apaga. */
export function AliadosSection({ tenantId }: { tenantId: string }) {
  const url = `/api/pack/commerce/platform/tenants/${tenantId}/aliados`;
  const { run, pending } = useAction({ refresh: false });
  const [estado, setEstado] = useState<EstadoAliados | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    void leer(url).then((lectura) => {
      if (!vigente) return;
      if ("error" in lectura) setError(lectura.error);
      else setEstado(lectura.estado);
    });
    return () => {
      vigente = false;
    };
  }, [url]);

  async function cambiar(habilitado: boolean) {
    await run(async () => {
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habilitado }),
      });
      const json = (await res.json().catch(() => ({}))) as EstadoAliados & { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo cambiar los aliados." };
      setEstado(json);
      return { ok: true, success: habilitado ? "Aliados encendidos." : "Aliados apagados." };
    });
  }

  return (
    <section className="flex flex-col gap-2" aria-labelledby={`aliados-${tenantId}`}>
      <div className="flex items-center justify-between gap-3">
        <label id={`aliados-${tenantId}`} htmlFor={`aliados-sw-${tenantId}`} className="text-sm font-medium text-headline">
          Aliados (proveedores)
        </label>
        {estado && (
          <Switch
            id={`aliados-sw-${tenantId}`}
            checked={estado.habilitado}
            disabled={pending}
            onCheckedChange={(valor) => void cambiar(valor)}
          />
        )}
      </div>
      {error ? (
        <p className="text-sm text-status-danger-fg">{error}</p>
      ) : !estado ? (
        <p className="text-sm text-body">Cargando…</p>
      ) : (
        <p className="text-xs text-body">
          Con los aliados encendidos, el negocio ve «Aliados» en Ventas, el filtro por aliado en Productos y el aliado en
          promociones y en el CSV. Apagarlos no borra nada.
          {estado.en ? ` Último cambio: ${formatDate(estado.en)}${estado.por ? ` por ${estado.por}` : ""}.` : ""}
        </p>
      )}
    </section>
  );
}
