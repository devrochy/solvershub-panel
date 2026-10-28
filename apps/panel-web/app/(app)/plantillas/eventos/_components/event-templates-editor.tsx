"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { EventTemplateEntry, MessageTemplatesSettings } from "@/lib/api/types";
import {
  claveDePlantilla,
  eventoLabel,
  faltantes,
  mapeoParaApi,
  rellenarCuerpo,
  rutasDesdeApi,
} from "@/lib/plantillas";
import { useAction } from "@/lib/use-action";

type Estado = { plantilla: string; rutas: Record<string, string>; respaldo: string };

/** Editor del mapa evento → plantilla aprobada + variables + texto de respaldo (HU-ARCH-13). */
export function EventTemplatesEditor({ initial }: { initial: MessageTemplatesSettings }) {
  const plantillas = initial.templates ?? [];
  const porClave = new Map(plantillas.map((t) => [claveDePlantilla(t.name, t.language), t]));

  const [estado, setEstado] = useState<Record<string, Estado>>(() =>
    Object.fromEntries(
      initial.events.map((ev) => {
        const guardado = initial.mapping[ev.event] as EventTemplateEntry | undefined;
        const clave = guardado?.template ? claveDePlantilla(guardado.template, guardado.language ?? "es") : "";
        const variables = porClave.get(clave)?.variables ?? [];
        return [
          ev.event,
          {
            plantilla: clave,
            rutas: rutasDesdeApi(variables, guardado?.variables as string[] | Record<string, string>),
            respaldo: guardado?.fallback_text ?? "",
          },
        ];
      }),
    ),
  );
  const guardar = useAction();

  function cambiar(evento: string, cambio: Partial<Estado>) {
    setEstado((prev) => ({ ...prev, [evento]: { ...prev[evento], ...cambio } }));
  }

  const incompletos = initial.events.filter((ev) => {
    const e = estado[ev.event];
    const t = porClave.get(e.plantilla);
    return t ? faltantes(t.variables, e.rutas).length > 0 : false;
  });

  async function save() {
    const mapping: Record<string, EventTemplateEntry> = {};
    for (const ev of initial.events) {
      const e = estado[ev.event];
      const t = porClave.get(e.plantilla);
      if (!t && !e.respaldo.trim()) continue;
      mapping[ev.event] = {
        template: t?.name ?? "",
        language: t?.language ?? "es",
        variables: t ? mapeoParaApi(t.variables, t.named, e.rutas) : [],
        fallback_text: e.respaldo,
        // Este editor no los edita: se conservan los textos por canal que ya tenía el evento.
        fallback_text_by_channel: (initial.mapping[ev.event] as EventTemplateEntry | undefined)?.fallback_text_by_channel ?? {},
      };
    }
    await guardar.run(async () => {
      const res = await fetch("/api/settings/message-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, error: json.error, success: "Plantillas por evento guardadas." };
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {plantillas.length === 0 && (
        <p className="text-sm text-body">
          Todavía no hay plantillas aprobadas por Meta en tus conexiones. Crea una de categoría
          «Utilidad» en Plantillas de WhatsApp y espera su aprobación.
        </p>
      )}
      {initial.events.map((ev) => {
        const e = estado[ev.event];
        const t = porClave.get(e.plantilla);
        const ejemplo = Object.fromEntries(
          (t?.variables ?? []).map((v) => [v, e.rutas[v] ? `{${e.rutas[v]}}` : ""]),
        );
        return (
          <Card key={ev.event}>
            <CardHeader>
              <CardTitle>{eventoLabel(ev.event)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Field label="Plantilla aprobada (fuera de las 24 horas)" htmlFor={`ev-${ev.event}`}>
                <Select
                  id={`ev-${ev.event}`}
                  value={e.plantilla}
                  onChange={(event) => cambiar(ev.event, { plantilla: event.target.value, rutas: {} })}
                >
                  <option value="">Sin plantilla (el aviso no sale fuera de las 24 horas)</option>
                  {plantillas.map((p) => (
                    <option key={claveDePlantilla(p.name, p.language)} value={claveDePlantilla(p.name, p.language)}>
                      {p.name} ({p.language})
                    </option>
                  ))}
                </Select>
              </Field>
              {t &&
                t.variables.map((v) => (
                  <Field key={v} label={`Variable {{${v}}}`} htmlFor={`ev-${ev.event}-${v}`}>
                    <Select
                      id={`ev-${ev.event}-${v}`}
                      value={e.rutas[v] ?? ""}
                      onChange={(event) =>
                        cambiar(ev.event, { rutas: { ...e.rutas, [v]: event.target.value } })
                      }
                    >
                      <option value="">Elige el dato…</option>
                      {Object.entries(ev.variables).map(([ruta, descripcion]) => (
                        <option key={ruta} value={ruta}>
                          {descripcion}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ))}
              {t && (
                <p className="rounded-sm bg-surface-2 p-3 text-sm text-body">{rellenarCuerpo(t.body, ejemplo)}</p>
              )}
              <Field
                label="Texto de respaldo (dentro de las 24 horas)"
                htmlFor={`ev-${ev.event}-respaldo`}
                help={`Puedes usar ${Object.keys(ev.variables)
                  .map((r) => `{${r}}`)
                  .join(", ")}.`}
              >
                <Textarea
                  id={`ev-${ev.event}-respaldo`}
                  rows={3}
                  maxLength={1000}
                  value={e.respaldo}
                  onChange={(event) => cambiar(ev.event, { respaldo: event.target.value })}
                />
              </Field>
            </CardContent>
          </Card>
        );
      })}
      <div className="flex items-center justify-end gap-3">
        {incompletos.length > 0 && (
          <p className="text-sm text-status-warning-fg">Completa las variables de cada plantilla elegida.</p>
        )}
        <Button
          type="button"
          variant="accent"
          onClick={() => void save()}
          disabled={guardar.pending || incompletos.length > 0}
        >
          {guardar.pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
