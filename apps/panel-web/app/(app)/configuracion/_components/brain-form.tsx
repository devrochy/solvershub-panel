"use client";

import { useState, type FormEvent } from "react";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import type { BrainSettings } from "@/lib/api/types";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { igualProfundo } from "@/lib/configuracion-secciones";
import { useAction } from "@/lib/use-action";

/** Formulario del Cerebro (modelos y límites). Responsabilidad: editar y guardar. */
export function BrainForm({ brain, puedeEditar = true }: { brain: BrainSettings; puedeEditar?: boolean }) {
  const [values, setValues] = useState(brain);
  const [guardado, setGuardado] = useState(brain);
  const { run, pending } = useAction();
  useAvisarCambios("cerebro", !igualProfundo(values, guardado));

  const set = <K extends keyof BrainSettings>(key: K, value: BrainSettings[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await run(async () => {
      const res = await fetch("/api/settings/brain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return { ok: false, status: res.status, error: json.error ?? "No se pudo guardar el cerebro." };
      setGuardado(values);
      return { ok: true, success: "Cerebro guardado." };
    });
  }

  return (
    <Card>
      <CardContent className="pt-5">
        <form onSubmit={onSubmit} className="flex flex-col gap-6">
          <ControlesEditables puedeEditar={puedeEditar} className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Modelo primario"
              htmlFor="model_primary"
              help="El modelo de IA que responde a tus clientes. Cambiarlo afecta el costo y la calidad de todas las respuestas."
              required
            >
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
            <Field
              label="Temperatura (0-2)"
              htmlFor="model_temperature"
              help="Qué tan variadas son las respuestas: cerca de 0 el asistente es más predecible y cerca de 2 más creativo. Para atender clientes conviene un valor bajo."
            >
              <InputNumero
                id="model_temperature"
                decimal
                step={0.1}
                min={0}
                max={2}
                value={values.model_temperature}
                onValueChange={(n) => set("model_temperature", n)}
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Máx. llamadas a herramientas por turno"
              htmlFor="policy_max_tool_calls"
              help="Cuántas veces puede usar una herramienta (agendar, consultar, cobrar…) para responder un solo mensaje. Entre 1 y 50."
            >
              <InputNumero
                id="policy_max_tool_calls"
                min={1}
                max={50}
                value={values.policy_max_tool_calls}
                onValueChange={(n) => set("policy_max_tool_calls", n)}
              />
            </Field>
            <Field
              label="Presupuesto por conversación"
              htmlFor="policy_budget"
              help="En dólares: el asistente deja de trabajar en una conversación al llegar a este gasto."
            >
              <InputNumero
                id="policy_budget"
                decimal
                step={0.1}
                min={0}
                value={values.policy_budget}
                onValueChange={(n) => set("policy_budget", n)}
              />
            </Field>
          </div>
          </ControlesEditables>

          {puedeEditar ? (
            <div>
              <Button type="submit" variant="accent" disabled={pending}>
                {pending ? "Guardando…" : "Guardar cerebro"}
              </Button>
            </div>
          ) : (
            <AvisoSoloLectura />
          )}
        </form>
      </CardContent>
    </Card>
  );
}
