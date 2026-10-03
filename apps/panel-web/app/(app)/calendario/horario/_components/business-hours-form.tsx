"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import {
  parseBusinessHours,
  serializeBusinessHours,
  WEEKDAYS as DIAS,
  type BusinessHours,
} from "@/lib/business-hours";

function partir(valor: string): { inicio: string; fin: string } {
  const [inicio = "", fin = ""] = (valor || "").split("-");
  return { inicio, fin };
}

export function BusinessHoursForm({
  pluginId,
  initialHours,
}: {
  pluginId: string;
  initialHours: string;
}) {
  const router = useRouter();
  const [horas, setHoras] = useState<BusinessHours>(() => parseBusinessHours(initialHours));
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  function setRango(dia: string, inicio: string, fin: string) {
    setHoras((prev) => ({ ...prev, [dia]: inicio && fin ? `${inicio}-${fin}` : "" }));
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus({ loading: true });
    // Carga el resto de la config para no pisarla (schema completo).
    const actual = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}`).then((r) =>
      r.json().catch(() => null),
    );
    const values = {
      ...((actual?.values as Record<string, unknown>) ?? {}),
      business_hours: serializeBusinessHours(horas),
    };
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } | string };
    if (!res.ok) {
      const msg = typeof json.error === "string" ? json.error : json.error?.message;
      setStatus({ error: msg ?? "No se pudo guardar el horario." });
      return;
    }
    setStatus({ success: "Horario guardado." });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {DIAS.map(({ key, label }) => {
        const { inicio, fin } = partir(horas[key] ?? "");
        const cerrado = !horas[key];
        return (
          <div key={key} className="flex flex-wrap items-end gap-3">
            <span className="w-24 text-sm text-headline">{label}</span>
            <Field label="Abre" htmlFor={`${key}-inicio`}>
              <Input
                id={`${key}-inicio`}
                type="time"
                value={inicio}
                disabled={cerrado}
                onChange={(e) => setRango(key, e.target.value, fin || "18:00")}
              />
            </Field>
            <Field label="Cierra" htmlFor={`${key}-fin`}>
              <Input
                id={`${key}-fin`}
                type="time"
                value={fin}
                disabled={cerrado}
                onChange={(e) => setRango(key, inicio || "08:00", e.target.value)}
              />
            </Field>
            <label className="flex items-center gap-2 pb-2 text-sm text-body">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-control-border"
                checked={cerrado}
                onChange={(e) =>
                  setHoras((prev) => ({
                    ...prev,
                    [key]: e.target.checked ? "" : "08:00-18:00",
                  }))
                }
              />
              Cerrado
            </label>
          </div>
        );
      })}

      <FormFeedback error={status.error} success={status.success} />
      <div>
        <Button type="submit" variant="accent" disabled={status.loading}>
          {status.loading ? "Guardando…" : "Guardar horario"}
        </Button>
      </div>
    </form>
  );
}
