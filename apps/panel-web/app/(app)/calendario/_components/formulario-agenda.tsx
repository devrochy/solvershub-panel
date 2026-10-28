"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { SelectorDeColor } from "@/components/domain/tipo-de-cita";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AgendaCalendario } from "@/lib/api/types";
import { aliasesDeTexto } from "@/lib/calendario/agenda";
import { parseBusinessHours, serializeBusinessHours, type BusinessHours } from "@/lib/business-hours";

import { HorarioEditor } from "./business-hours-form";

/**
 * Alta o edición de una agenda (HU-CAL-08): el nombre es el que el asistente le dice al
 * cliente; la descripción y los alias le sirven para recomendar según lo que pide. Lo usan el
 * cajón de ajustes de Agenda y la ficha de la conexión de Google.
 */
export function FormularioAgenda({
  agenda,
  idBase = "ag",
  onSaved,
  onCancel,
  soloLectura = false,
}: {
  agenda?: AgendaCalendario;
  idBase?: string;
  onSaved?: () => void;
  onCancel?: () => void;
  soloLectura?: boolean;
}) {
  const router = useRouter();
  const [propio, setPropio] = useState(Boolean(agenda?.business_hours));
  const [horas, setHoras] = useState<BusinessHours>(() => parseBusinessHours(agenda?.business_hours ?? ""));
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const zona = String(data.get("timezone") ?? "").trim();
    const cuerpo: Record<string, unknown> = {
      name: String(data.get("name") ?? ""),
      description: String(data.get("description") ?? ""),
      aliases: aliasesDeTexto(String(data.get("aliases") ?? "")),
      ...(data.get("color") ? { color: String(data.get("color")) } : {}),
    };
    if (agenda) {
      if (zona) cuerpo.timezone = zona;
      else cuerpo.inherit_timezone = true;
      if (propio) cuerpo.business_hours = serializeBusinessHours(horas);
      else cuerpo.inherit_business_hours = true;
      if (!agenda.is_default) cuerpo.active = data.get("active") === "on";
    } else {
      if (zona) cuerpo.timezone = zona;
      if (propio) cuerpo.business_hours = serializeBusinessHours(horas);
    }
    setStatus({ loading: true });
    const res = await fetch(agenda ? `/api/pack/calendar/calendars/${agenda.id}` : "/api/pack/calendar/calendars", {
      method: agenda ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar la agenda." });
      return;
    }
    setStatus({ success: agenda ? "Agenda guardada." : "Agenda creada." });
    router.refresh();
    onSaved?.();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <fieldset disabled={soloLectura} className="flex flex-col gap-4">
        <Field
          label="Nombre"
          htmlFor={`${idBase}-name`}
          required
          help="Es el que el asistente le dice al cliente (ej. «Dra. Ana», «Sede Norte»)."
        >
          <Input id={`${idBase}-name`} name="name" required maxLength={60} defaultValue={agenda?.name ?? ""} />
        </Field>
        <Field
          label="Descripción"
          htmlFor={`${idBase}-desc`}
          help="Para quién es o qué atiende: ayuda al asistente a recomendar según lo que pide el cliente."
        >
          <Textarea id={`${idBase}-desc`} name="description" rows={2} defaultValue={agenda?.description ?? ""} />
        </Field>
        <Field label="Alias" htmlFor={`${idBase}-alias`} help="Otras formas de nombrarla, separadas por coma (ej. doctora, sede norte).">
          <Input id={`${idBase}-alias`} name="aliases" defaultValue={(agenda?.aliases ?? []).join(", ")} />
        </Field>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-headline">Color</legend>
          <SelectorDeColor name="color" defaultValue={agenda?.color} idBase={`${idBase}-color`} />
        </fieldset>
        <Field
          label="Zona horaria"
          htmlFor={`${idBase}-tz`}
          help={`Vacío = la del negocio${agenda ? ` (${agenda.timezone})` : ""}. Ej. America/Bogota.`}
        >
          <Input id={`${idBase}-tz`} name="timezone" defaultValue={agenda?.own_timezone ?? ""} placeholder="La del negocio" />
        </Field>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-headline">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-control-border"
              checked={propio}
              onChange={(e) => setPropio(e.target.checked)}
            />
            Horario propio (si no, usa el del negocio)
          </label>
          {propio && <HorarioEditor horas={horas} onChange={setHoras} idBase={`${idBase}-h`} />}
        </div>
        {agenda && !agenda.is_default && (
          <label className="flex items-center gap-2 text-sm text-headline">
            <input
              type="checkbox"
              name="active"
              className="h-4 w-4 rounded border-control-border"
              defaultChecked={agenda.active}
            />
            Activa (el asistente la ofrece a los clientes)
          </label>
        )}
      </fieldset>
      <FormFeedback error={status.error} success={status.success} />
      {!soloLectura && (
        <div className="flex justify-end gap-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" variant="accent" disabled={status.loading}>
            {status.loading ? "Guardando…" : agenda ? "Guardar agenda" : "Crear agenda"}
          </Button>
        </div>
      )}
    </form>
  );
}
