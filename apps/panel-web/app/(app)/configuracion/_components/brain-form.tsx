"use client";

import { useMemo, useState, type FormEvent } from "react";

import { AvisoSoloLectura, ControlesEditables } from "@/app/(app)/configuracion/_components/solo-lectura";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { BrainSettings, CatalogoConfig } from "@/lib/api/types";
import { ayudaDelCatalogo, indexarCatalogo } from "@/lib/catalogo-config";
import { useAvisarCambios } from "@/lib/cambios-sin-guardar";
import { TEMPERATURAS, cercano } from "@/lib/configuracion-resumen";
import { igualProfundo } from "@/lib/configuracion-secciones";
import { useAction } from "@/lib/use-action";

/** Formulario del Cerebro (modelos y límites). Responsabilidad: editar y guardar. */
export function BrainForm({
  brain,
  catalogo = null,
  puedeEditar = true,
  onGuardado,
}: {
  brain: BrainSettings;
  catalogo?: CatalogoConfig | null;
  puedeEditar?: boolean;
  /** Tras guardar bien: el cajón se cierra. */
  onGuardado?: () => void;
}) {
  const indice = useMemo(() => indexarCatalogo(catalogo), [catalogo]);
  const ayuda = (clave: string, respaldo: string) => ayudaDelCatalogo(indice, clave, respaldo);
  const [values, setValues] = useState(brain);
  const [guardado, setGuardado] = useState(brain);
  const { run, pending } = useAction();
  useAvisarCambios("cerebro", !igualProfundo(values, guardado));

  const set = <K extends keyof BrainSettings>(key: K, value: BrainSettings[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const ok = await run(async () => {
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
    if (ok) onGuardado?.();
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
              help={ayuda("model_primary", "El modelo de IA que responde a tus clientes. Cambiarlo afecta el costo y la calidad de todas las respuestas.")}
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
              help={ayuda("model_router", "Para turnos complejos sin herramientas.")}
            >
              <Input
                id="model_router"
                value={values.model_router ?? ""}
                onChange={(e) => set("model_router", e.target.value)}
              />
            </Field>
            <Field label="Modelo de respaldo" htmlFor="model_fallback" help={ayuda("model_fallback", "Se usa si el primario falla.")}>
              <Input
                id="model_fallback"
                value={values.model_fallback ?? ""}
                onChange={(e) => set("model_fallback", e.target.value)}
              />
            </Field>
            <div className="flex flex-col gap-2 md:col-span-2">
              <span className="text-[13px] font-medium text-body">Cómo salen las respuestas</span>
              <SegmentedControl
                label="Cómo salen las respuestas"
                options={TEMPERATURAS.map((o) => ({ value: o.value, label: o.label }))}
                value={cercano(TEMPERATURAS, values.model_temperature, (o) => o.valor).valor === values.model_temperature ? cercano(TEMPERATURAS, values.model_temperature, (o) => o.valor).value : ""}
                onChange={(v) => set("model_temperature", Number(v))}
                className="self-start"
              />
              <p className="text-xs text-text-soft">Precisas: casi siempre igual, lo mejor para atender clientes. Creativas: más variadas.</p>
            </div>
            <Field
              label="Temperatura exacta (de 0 a 2)"
              htmlFor="model_temperature"
              help={ayuda("model_temperature", "Qué tan variadas son las respuestas: cerca de 0 el asistente es más predecible y cerca de 2 más creativo. Para atender clientes conviene un valor bajo.")}
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
              help={ayuda("policy_max_tool_calls", "Cuántas veces puede usar una herramienta (agendar, consultar, cobrar…) para responder un solo mensaje. Entre 1 y 50.")}
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
              help={ayuda("policy_budget", "En dólares: el asistente deja de trabajar en una conversación al llegar a este gasto.")}
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
              <Button type="submit" variant="accent" loading={pending}>
                Guardar
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
