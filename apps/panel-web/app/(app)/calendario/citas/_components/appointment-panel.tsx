"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { mensajeAsistencia, puedeMarcarAsistencia } from "@/lib/citas";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast-store";

import { describeNotification, type ClientNotification } from "./notification";
import { type Activity, type CalendarEvent, type Tipo } from "./types";

function toLocalInput(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Detalle / edición / alta de una cita o bloqueo, con historial de actividades y
 * confirmación de aviso (HU-CAL-03). Para citas permite editar campos y horario,
 * cancelar y ver el historial; para bloqueos permite editar y eliminar.
 */
export function AppointmentPanel({
  tipos,
  event,
  draft,
  onClose,
  onSaved,
}: {
  tipos: Tipo[];
  event: CalendarEvent | null;
  draft: { start: string; end: string } | null;
  onClose: () => void;
  /** `message`: qué pasó de verdad (incluido el aviso al cliente) para mostrarlo al cerrar. */
  onSaved: (message?: string) => void;
}) {
  const isBlock = event?.kind === "block";
  const isNew = !event;
  const confirm = useConfirm();
  const [notify, setNotify] = useState(true);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string; success?: string }>({});
  const [activities, setActivities] = useState<Activity[]>([]);

  const apptId = event?.id.replace("appt-", "");
  const blockId = event?.id.replace("block-", "");

  useEffect(() => {
    if (!event || isBlock) return;
    const id = event.id.replace("appt-", "");
    void fetch(`/api/pack/calendar/appointments/${id}/activities`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Activity[]) => setActivities(rows))
      .catch(() => setActivities([]));
  }, [event, isBlock]);

  async function saveAppointment(form: HTMLFormElement) {
    const data = new FormData(form);
    const body = {
      title: String(data.get("title") ?? ""),
      attendee_email: String(data.get("attendee_email") ?? ""),
      notes: String(data.get("notes") ?? ""),
      appointment_type_id: String(data.get("appointment_type_id") ?? "") || null,
      start_at: new Date(String(data.get("start_at"))).toISOString(),
      end_at: new Date(String(data.get("end_at"))).toISOString(),
      notify,
    };
    const url = isNew ? "/api/pack/calendar/appointments" : `/api/pack/calendar/appointments/${apptId}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      notification?: ClientNotification;
    };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar la cita." });
      return;
    }
    onSaved(isNew ? "Cita creada." : describeNotification("Cita guardada.", json.notification));
  }

  async function saveBlock(form: HTMLFormElement) {
    const data = new FormData(form);
    const body = {
      start_at: new Date(String(data.get("start_at"))).toISOString(),
      end_at: new Date(String(data.get("end_at"))).toISOString(),
      reason: String(data.get("reason") ?? ""),
    };
    const res = await fetch(`/api/pack/calendar/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      setStatus({ error: "No se pudo guardar el bloqueo." });
      return;
    }
    onSaved();
  }

  async function marcarAsistencia(asistio: boolean) {
    if (!apptId) return;
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/calendar/appointments/${apptId}/asistencia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ asistio }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo marcar la asistencia." });
      return;
    }
    setStatus({});
    onSaved(mensajeAsistencia(asistio));
  }

  async function cancelAppointment() {
    const aceptado = await confirm({
      title: "Cancelar cita",
      description: notify
        ? "Se cancelará la cita y le avisaremos al cliente por correo y WhatsApp. Esta acción no se puede deshacer."
        : "Se cancelará la cita sin avisar al cliente. Esta acción no se puede deshacer.",
      confirmLabel: "Cancelar cita",
      destructive: true,
    });
    if (!aceptado) return;
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/calendar/appointments/${apptId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notify }),
    });
    setStatus({ loading: false });
    if (!res.ok) {
      toast.error("No se pudo cancelar la cita.");
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { notification?: ClientNotification };
    onSaved(describeNotification("Cita cancelada.", json.notification));
  }

  async function deleteBlock() {
    const aceptado = await confirm({
      title: "Eliminar bloqueo",
      description: "Se eliminará el bloqueo de la agenda. Esta acción no se puede deshacer.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!aceptado) return;
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/calendar/blocks/${blockId}`, { method: "DELETE" });
    setStatus({ loading: false });
    if (!res.ok) {
      toast.error("No se pudo eliminar el bloqueo.");
      return;
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={isNew ? "Nueva cita" : isBlock ? "Bloqueo" : event?.title ?? "Cita"}
        description={
          isBlock
            ? "Franja en que el asistente no agenda (fuera de oficina)."
            : "Cambiar el horario envía el correo de reagenda si confirmás el aviso."
        }
      >
        {isBlock ? (
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              void saveBlock(e.currentTarget);
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Motivo" htmlFor="b-reason">
              <Input id="b-reason" name="reason" defaultValue={event?.title ?? ""} />
            </Field>
            <Field label="Inicio" htmlFor="b-start" required>
              <Input id="b-start" name="start_at" type="datetime-local" defaultValue={toLocalInput(event?.start)} required />
            </Field>
            <Field label="Fin" htmlFor="b-end" required>
              <Input id="b-end" name="end_at" type="datetime-local" defaultValue={toLocalInput(event?.end)} required />
            </Field>
            <div className="flex justify-between">
              <Button type="button" variant="ghost" onClick={() => void deleteBlock()}>
                Eliminar
              </Button>
              <Button type="submit" variant="accent">
                Guardar
              </Button>
            </div>
            <FormFeedback error={status.error} success={status.success} />
          </form>
        ) : (
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              void saveAppointment(e.currentTarget);
            }}
            className="flex flex-col gap-3"
          >
            <Field label="Título" htmlFor="c-title" required>
              <Input id="c-title" name="title" defaultValue={event?.title ?? ""} required />
            </Field>
            <Field label="Tipo de cita" htmlFor="c-type">
              <Select id="c-type" name="appointment_type_id" defaultValue={event?.appointment_type_id ?? ""}>
                <option value="">— Sin tipo —</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cliente (email)" htmlFor="c-email">
              <Input id="c-email" name="attendee_email" type="email" defaultValue={event?.attendee_email ?? ""} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio" htmlFor="c-start" required>
                <Input id="c-start" name="start_at" type="datetime-local" defaultValue={toLocalInput(event?.start ?? draft?.start)} required />
              </Field>
              <Field label="Fin" htmlFor="c-end" required>
                <Input id="c-end" name="end_at" type="datetime-local" defaultValue={toLocalInput(event?.end ?? draft?.end)} required />
              </Field>
            </div>
            <Field label="Notas" htmlFor="c-notes">
              <Textarea id="c-notes" name="notes" rows={2} defaultValue={event?.notes ?? ""} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-body">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Avisar al cliente (correo y WhatsApp) y a los colaboradores (correo)
            </label>
            <div className="flex justify-between">
              {!isNew && event?.can_cancel ? (
                <Button type="button" variant="ghost" onClick={() => void cancelAppointment()}>
                  Cancelar cita
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" variant="accent" disabled={status.loading}>
                {isNew ? "Crear" : "Guardar"}
              </Button>
            </div>
            <FormFeedback error={status.error} success={status.success} />

            {!isNew && event && puedeMarcarAsistencia(event) && (
              <div className="flex flex-col gap-2 rounded-md border border-border p-3">
                <span className="text-sm text-body">
                  ¿El cliente asistió?
                  {event.status === "asistio" ? " (marcada: asistió)" : event.status === "no_asistio" ? " (marcada: no asistió)" : ""}
                </span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" disabled={status.loading} onClick={() => void marcarAsistencia(true)}>
                    Asistió
                  </Button>
                  <Button type="button" variant="outline" disabled={status.loading} onClick={() => void marcarAsistencia(false)}>
                    No asistió
                  </Button>
                </div>
              </div>
            )}

            {!isNew && activities.length > 0 && (
              <div className="mt-2 border-t pt-3">
                <p className="mb-2 text-sm font-medium text-headline">Historial</p>
                <ul className="flex flex-col gap-1">
                  {activities.map((a, i) => (
                    <li key={i} className="flex items-center justify-between text-xs text-body">
                      <span>
                        <Badge variant={a.action === "cancelada" ? "danger" : a.action === "reprogramada" ? "accent" : "success"}>
                          {a.action}
                        </Badge>{" "}
                        {a.actor === "panel" ? "panel" : "asistente"}
                      </span>
                      <span>{formatDateTime(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
