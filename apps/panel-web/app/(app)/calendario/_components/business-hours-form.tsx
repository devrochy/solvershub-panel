"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { opcionesDeHora } from "@/lib/calendario/formulario";
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

/**
 * Editor de los 7 días (controlado, AGE-10): una fila por día con un interruptor Abierto/Cerrado
 * y las dos horas en formato de Colombia, cada media hora. Lo usan el horario del negocio y el de
 * cada agenda.
 */
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

  function copiarLunes() {
    const lunes = horas.mon ?? "";
    onChange(Object.fromEntries(DIAS.map(({ key }) => [key, key === "sun" ? horas.sun ?? "" : lunes])));
  }

  return (
    <div className="flex flex-col">
      <ul className="flex flex-col">
        {DIAS.map(({ key, label }) => {
          const { inicio, fin } = partir(horas[key] ?? "");
          const abierto = Boolean(horas[key]);
          return (
            <li key={key} className="grid grid-cols-[minmax(0,6.5rem)_auto_minmax(0,1fr)] items-center gap-3 border-t border-border-soft py-2.5 first:border-t-0">
              <span className="text-sm text-headline">{label}</span>
              <Switch
                id={`${idBase}-${key}-abierto`}
                aria-label={`${label} abierto`}
                checked={abierto}
                onCheckedChange={(v) => onChange({ ...horas, [key]: v ? "08:00-18:00" : "" })}
              />
              {abierto ? (
                <div className="grid grid-cols-2 gap-2">
                  <Select aria-label={`${label}, abre`} value={inicio} onChange={(e) => setRango(key, e.target.value, fin || "18:00")}>
                    {opcionesDeHora(30, 0, 23.5, inicio).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                  <Select aria-label={`${label}, cierra`} value={fin} onChange={(e) => setRango(key, inicio || "08:00", e.target.value)}>
                    {opcionesDeHora(30, 0, 23.5, fin).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : (
                <span className="text-sm text-text-soft">Cerrado</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="pt-2">
        <Button type="button" variant="ghost" onClick={copiarLunes}>
          Copiar el lunes a los demás días
        </Button>
      </div>
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
  // Un horario guardado que no se entiende no se pisa sin avisar (AGE-10).
  const ilegible = initialHours.trim() !== "" && Object.keys(parseBusinessHours(initialHours)).length === 0;
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
      {ilegible && (
        <p role="status" className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          No pudimos leer el horario guardado, así que todos los días aparecen cerrados. Si guardas, se reemplaza por este.
        </p>
      )}
      <HorarioEditor horas={horas} onChange={setHoras} idBase="negocio" />
      <FormFeedback error={status.error} success={status.success} />
      <div>
        <Button type="submit" variant="accent" loading={status.loading}>
          Guardar horario
        </Button>
      </div>
    </form>
  );
}
