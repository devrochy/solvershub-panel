"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { SubscriptionProviderSettings } from "@/lib/api/types";
import { textoEstado } from "@/lib/suscripciones";
import { useAction } from "@/lib/use-action";

/** Qué habilidad cobra los planes recurrentes del negocio y, si hay dos, cuál usar. */
export function SubscriptionProviderCard({ settings }: { settings: SubscriptionProviderSettings }) {
  const [provider, setProvider] = useState(settings.configurado ?? "");
  const { run, pending } = useAction();
  const problema = settings.estado === "ambiguo" || settings.estado === "invalido";
  const elegible = settings.habilitados.length > 1 || problema;

  async function guardar() {
    await run(async () => {
      const res = await fetch("/api/settings/subscription-provider", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider || null }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar el proveedor." };
      return { ok: true, success: "Proveedor guardado. Los planes pendientes se activan en unos minutos." };
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-headline">Cobro de planes recurrentes</h2>
          <p role={problema ? "alert" : undefined} className={problema ? "text-sm text-status-danger-fg" : "text-sm text-body"}>
            {textoEstado(settings)}
          </p>
        </div>
        {elegible && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Habilidad que cobra los planes" htmlFor="sub-provider" className="sm:flex-1">
              <Select id="sub-provider" value={provider} onChange={(e) => setProvider(e.target.value)}>
                <option value="">Elegir…</option>
                {settings.habilitados.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Button type="button" variant="accent" onClick={guardar} disabled={pending || !provider}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
