"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import type { BrainSettings } from "@/lib/api/types";

/** Formulario del Cerebro (modelos y límites). Responsabilidad: editar y guardar. */
export function BrainForm({ brain }: { brain: BrainSettings }) {
  const router = useRouter();
  const [values, setValues] = useState(brain);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  const set = <K extends keyof BrainSettings>(key: K, value: BrainSettings[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ loading: true });
    const res = await fetch("/api/settings/brain", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar." });
      return;
    }
    setStatus({ success: "Cerebro guardado." });
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Modelo primario" htmlFor="model_primary" required>
              <Input
                id="model_primary"
                required
                value={values.model_primary}
                onChange={(e) => set("model_primary", e.target.value)}
              />
            </Field>
            <Field
              label="Modelo de razonamiento"
              htmlFor="model_router"
              help="Para turnos complejos sin herramientas."
            >
              <Input
                id="model_router"
                value={values.model_router ?? ""}
                onChange={(e) => set("model_router", e.target.value)}
              />
            </Field>
            <Field label="Modelo de respaldo" htmlFor="model_fallback" help="Se usa si el primario falla.">
              <Input
                id="model_fallback"
                value={values.model_fallback ?? ""}
                onChange={(e) => set("model_fallback", e.target.value)}
              />
            </Field>
            <Field label="Temperatura (0-2)" htmlFor="model_temperature">
              <Input
                id="model_temperature"
                type="number"
                step="0.1"
                min={0}
                max={2}
                value={values.model_temperature}
                onChange={(e) => set("model_temperature", Number(e.target.value))}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Máx. llamadas a herramientas por turno" htmlFor="policy_max_tool_calls">
              <Input
                id="policy_max_tool_calls"
                type="number"
                min={1}
                max={50}
                value={values.policy_max_tool_calls}
                onChange={(e) => set("policy_max_tool_calls", Number(e.target.value))}
              />
            </Field>
            <Field
              label="Presupuesto por conversación"
              htmlFor="policy_budget"
              help="En dólares (corta el turno al alcanzarlo)."
            >
              <Input
                id="policy_budget"
                type="number"
                step="0.1"
                min={0}
                value={values.policy_budget}
                onChange={(e) => set("policy_budget", Number(e.target.value))}
              />
            </Field>
          </div>

          <FormFeedback error={status.error} success={status.success} />

          <div>
            <Button type="submit" variant="accent" disabled={status.loading}>
              {status.loading ? "Guardando…" : "Guardar cerebro"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
