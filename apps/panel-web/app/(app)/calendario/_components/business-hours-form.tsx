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

/** Editor de los 7 días (controlado): lo usan el horario del negocio y el de cada agenda. */
export function HorarioEditor({
  horas,
  onChange,
  idBase = "h",
}: {
  horas: BusinessHours;
  onChange: (horas: BusinessHours) => void;
  idBase?: string;
}) {
  function setRango(dia: string, inicio: string, fin: string) {
    onChange({ ...horas, [dia]: inicio && fin ? `${inicio}-${fin}` : "" });
  }

  return (
    <div className="flex flex-col gap-4">
      {DIAS.map(({ key, label }) => {
        const { inicio, fin } = partir(horas[key] ?? "");
        const cerrado = !horas[key];
        return (
          <div key={key} className="grid grid-cols-2 gap-x-3 gap-y-2 sm:flex sm:items-end">
            <span className="text-sm text-headline sm:w-24 sm:pb-2">{label}</span>
            <label className="flex items-center gap-2 justify-self-end text-sm text-body sm:order-last sm:pb-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-control-border"
                checked={cerrado}
                onChange={(e) => onChange({ ...horas, [key]: e.target.checked ? "" : "08:00-18:00" })}
              />
              Cerrado
            </label>
            <Field label="Abre" htmlFor={`${idBase}-${key}-inicio`}>
              <Input
                id={`${idBase}-${key}-inicio`}
                type="time"
                value={inicio}
                disabled={cerrado}
                onChange={(e) => setRango(key, e.target.value, fin || "18:00")}
              />
            </Field>
            <Field label="Cierra" htmlFor={`${idBase}-${key}-fin`}>
              <Input
                id={`${idBase}-${key}-fin`}
                type="time"
                value={fin}
                disabled={cerrado}
                onChange={(e) => setRango(key, inicio || "08:00", e.target.value)}
              />
            </Field>
          </div>
        );
      })}
    </div>
  );
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
      <HorarioEditor horas={horas} onChange={setHoras} idBase="negocio" />
      <FormFeedback error={status.error} success={status.success} />
      <div>
        <Button type="submit" variant="accent" disabled={status.loading}>
          {status.loading ? "Guardando…" : "Guardar horario"}
        </Button>
      </div>
    </form>
  );
}
