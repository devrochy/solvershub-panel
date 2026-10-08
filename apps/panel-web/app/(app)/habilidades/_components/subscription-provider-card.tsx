"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import type { SubscriptionProviderSettings } from "@/lib/api/types";
import { textoEstado } from "@/lib/suscripciones";

/** Qué habilidad cobra los planes recurrentes del negocio y, si hay dos, cuál usar. */
export function SubscriptionProviderCard({ settings }: { settings: SubscriptionProviderSettings }) {
  const router = useRouter();
  const [provider, setProvider] = useState(settings.configurado ?? "");
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});
  const problema = settings.estado === "ambiguo" || settings.estado === "invalido";
  const elegible = settings.habilitados.length > 1 || problema;

  async function guardar() {
    setStatus({ loading: true });
    const res = await fetch("/api/settings/subscription-provider", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: provider || null }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar." });
      return;
    }
    setStatus({ success: "Proveedor guardado. Los planes pendientes se activan en unos minutos." });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold text-headline">Cobro de planes recurrentes</h2>
          <p role={problema ? "alert" : undefined} className={problema ? "text-sm text-danger" : "text-sm text-body"}>
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
            <Button type="button" variant="accent" onClick={guardar} disabled={status.loading || !provider}>
              {status.loading ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        )}
        <FormFeedback error={status.error} success={status.success} />
      </CardContent>
    </Card>
  );
}
