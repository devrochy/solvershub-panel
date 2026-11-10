"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { Field } from "@/components/ui/field";
import { FormFeedback } from "@/components/ui/form-feedback";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { type LeyendaAgenda, type QueCrear } from "@/lib/calendario/agenda";
import {
  aIso,
  diaLargo,
  etiquetaDeDuracion,
  minutosEntre,
  opcionesDeDuracion,
  opcionesDeHora,
  partesLocales,
} from "@/lib/calendario/formulario";
import { mensajeAsistencia, puedeMarcarAsistencia } from "@/lib/citas";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/lib/toast-store";

import { describeNotification, type ClientNotification } from "./notification";
import { type Activity, type CalendarEvent, type Tipo } from "./types";

const ACCION: Record<string, string> = {
  creada: "Se creó",
  reprogramada: "Cambió de horario",
  cancelada: "Se canceló",
  asistio: "El cliente vino",
  no_asistio: "El cliente no vino",
};

const ESTADO: Record<string, { label: string; tono: "success" | "warning" | "neutral" }> = {
  asistio: { label: "Vino", tono: "success" },
  no_asistio: { label: "No vino", tono: "warning" },
  cancelled: { label: "Cancelada", tono: "neutral" },
};

/**
 * Panel lateral de la Agenda (HU-CAL-03, rediseñado en AGE-06/07). Una cita se abre en un resumen:
 * cuándo, con quién y el tipo, «¿Vino?» arriba si ya pasó, y Editar o Cancelar la cita. Crear y
 * editar usan un formulario corto: el cliente, el tipo, el día y la hora en formato de Colombia; el
 * fin sale de la duración. Un bloqueo se crea desde el mismo panel y se edita o elimina ahí.
 */
export function AppointmentPanel({
  tipos,
  agendas = [],
  todasLasAgendas = [],
  agendaInicial,
  timezone,
  event,
  draft,
  onClose,
  onSaved,
}: {
  tipos: Tipo[];
  /** Agendas activas; con 2 o más hay que elegir una al crear (HU-CAL-08). */
  agendas?: LeyendaAgenda[];
  /** Todas las agendas, para decir con quién es una cita aunque solo haya una. */
  todasLasAgendas?: LeyendaAgenda[];
  /** Agenda propuesta al crear: la única que se ve, o la principal. */
  agendaInicial?: string;
  timezone: string;
  event: CalendarEvent | null;
  draft: { start: string; end: string } | null;
  onClose: () => void;
  /** `message`: qué pasó de verdad (incluido el aviso al cliente) para mostrarlo al cerrar. */
  onSaved: (message?: string) => void;
}) {
  const isNew = !event;
  const [queCrear, setQueCrear] = useState<QueCrear>("cita");
  const isBlock = isNew ? queCrear === "bloqueo" : event?.kind === "block";
  const [editando, setEditando] = useState(isNew || event?.kind === "block");
  const confirm = useConfirm();
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const [activities, setActivities] = useState<Activity[]>([]);

  const inicio = partesLocales(event?.start ?? draft?.start);
  const [dia, setDia] = useState(inicio.dia);
  const [hora, setHora] = useState(inicio.hora);
  const [tipoId, setTipoId] = useState(event?.appointment_type_id ?? "");
  const duracionDelTipo = (id: string) => tipos.find((t) => t.id === id)?.duration_minutes ?? undefined;
  const [duracion, setDuracion] = useState(
    minutosEntre(event?.start, event?.end) ?? (isNew ? undefined : 30) ?? minutosEntre(draft?.start, draft?.end) ?? 30,
  );
  const [horaFin, setHoraFin] = useState(partesLocales(event?.end ?? draft?.end).hora);
  const [notify, setNotify] = useState(true);

  const hayVarias = agendas.length >= 2;
  const agendaDelEvento = todasLasAgendas.find((a) => a.id === event?.calendar_id);
  const tipoDelEvento = tipos.find((t) => t.id === event?.appointment_type_id);
  const apptId = event?.id.replace("appt-", "");
  const blockId = event?.id.replace("block-", "");

  useEffect(() => {
    if (!event || event.kind === "block") return;
    const id = event.id.replace("appt-", "");
    void fetch(`/api/pack/calendar/appointments/${id}/activities`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Activity[]) => setActivities(rows))
      .catch(() => setActivities([]));
  }, [event]);

  function elegirTipo(id: string) {
    setTipoId(id);
    const min = duracionDelTipo(id);
    if (min) setDuracion(min);
  }

  async function saveAppointment(form: HTMLFormElement) {
    const data = new FormData(form);
    setStatus({ loading: true });
    const body = {
      title: String(data.get("title") ?? "").trim(),
      attendee_email: String(data.get("attendee_email") ?? "").trim(),
      notes: String(data.get("notes") ?? ""),
      appointment_type_id: tipoId || null,
      start_at: aIso(dia, hora),
      end_at: aIso(dia, hora, duracion),
      notify,
      ...(isNew && data.get("calendar_id") ? { calendar_id: String(data.get("calendar_id")) } : {}),
    };
    const url = isNew ? "/api/pack/calendar/appointments" : `/api/pack/calendar/appointments/${apptId}`;
    const res = await fetch(url, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; notification?: ClientNotification };
    if (!res.ok) {
      setStatus({ error: json.error ?? "No se pudo guardar la cita. Revisa el horario y vuelve a intentarlo." });
      return;
    }
    onSaved(isNew ? "Cita creada." : describeNotification("Cita guardada.", json.notification));
  }

  async function saveBlock(form: HTMLFormElement) {
    const data = new FormData(form);
    if (horaFin <= hora) {
      setStatus({ error: "El bloqueo tiene que terminar después de empezar." });
      return;
    }
    setStatus({ loading: true });
    const body = {
      start_at: aIso(dia, hora),
      end_at: aIso(dia, horaFin),
      reason: String(data.get("reason") ?? ""),
      ...(isNew && data.get("calendar_id") ? { calendar_id: String(data.get("calendar_id")) } : {}),
    };
    const res = await fetch(isNew ? "/api/pack/calendar/blocks" : `/api/pack/calendar/blocks/${blockId}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus({ error: json.error ?? "No se pudo guardar el bloqueo." });
      return;
    }
    onSaved(isNew ? "Bloqueo creado." : "Bloqueo guardado.");
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
      title: `¿Cancelar la cita de ${event?.title ?? "este cliente"}?`,
      description: "Le avisamos al cliente por correo y WhatsApp. Esta acción no se puede deshacer.",
      confirmLabel: "Cancelar la cita",
      cancelLabel: "No cancelar",
      destructive: true,
    });
    if (!aceptado) return;
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/calendar/appointments/${apptId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notify: true }),
    });
    setStatus({});
    if (!res.ok) {
      toast.error("No se pudo cancelar la cita.");
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { notification?: ClientNotification };
    onSaved(describeNotification("Cita cancelada.", json.notification));
  }

  async function deleteBlock() {
    const aceptado = await confirm({
      title: "¿Eliminar el bloqueo?",
      description: "Tu agente vuelve a poder agendar en esas horas.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!aceptado) return;
    setStatus({ loading: true });
    const res = await fetch(`/api/pack/calendar/blocks/${blockId}`, { method: "DELETE" });
    setStatus({});
    if (!res.ok) {
      toast.error("No se pudo eliminar el bloqueo.");
      return;
    }
    onSaved("Bloqueo eliminado.");
  }

  const horaEnNegocio = (iso: string) =>
    new Intl.DateTimeFormat("es-CO", { timeZone: timezone, hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  const fechaEnNegocio = (iso: string) =>
    new Intl.DateTimeFormat("es-CO", { timeZone: timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));

  const selectorAgenda = (id: string) =>
    hayVarias && isNew ? (
      <Field label="Con quién" htmlFor={id} required help="Cada agenda tiene su propia disponibilidad.">
        <Select id={id} name="calendar_id" required defaultValue={agendaInicial ?? agendas[0]?.id}>
          {agendas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </Field>
    ) : null;

  const campoDia = (
    <Field label="Día" htmlFor="c-dia" required help={dia ? diaLargo(dia) : undefined}>
      <Input id="c-dia" type="date" value={dia} onChange={(e) => setDia(e.target.value)} required />
    </Field>
  );

  // Resumen de una cita existente (AGE-07).
  if (!editando && event && !isBlock) {
    const estado = ESTADO[event.status];
    const pendiente = event.status === "scheduled" && puedeMarcarAsistencia(event);
    return (
      <Sheet open onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          title={event.title || "Cita"}
          description={`${tipoDelEvento?.name ?? "Cita"} · ${fechaEnNegocio(event.start)}, de ${horaEnNegocio(event.start)} a ${horaEnNegocio(event.end)}`}
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              {event.can_cancel && event.status !== "cancelled" ? (
                <Button variant="ghost" disabled={status.loading} onClick={() => void cancelAppointment()}>
                  Cancelar la cita
                </Button>
              ) : (
                <span />
              )}
              {event.status !== "cancelled" && (
                <Button variant="outline" onClick={() => setEditando(true)}>
                  Editar
                </Button>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-5">
            {pendiente && (
              <div className="flex flex-col gap-3 rounded-md border border-border-soft bg-surface-2 p-4">
                <p className="text-sm font-medium text-headline">¿Vino {event.title || "el cliente"}?</p>
                <div className="flex gap-2">
                  <Button variant="outline" disabled={status.loading} onClick={() => void marcarAsistencia(true)}>
                    Vino
                  </Button>
                  <Button variant="outline" disabled={status.loading} onClick={() => void marcarAsistencia(false)}>
                    No vino
                  </Button>
                </div>
                <p className="text-xs text-text-soft">Si no vino, tu agente le escribe para reagendar.</p>
              </div>
            )}
            <dl className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
              {estado && (
                <>
                  <dt className="text-text-soft">Estado</dt>
                  <dd>
                    <Badge variant={estado.tono}>{estado.label}</Badge>
                  </dd>
                </>
              )}
              <dt className="text-text-soft">Con quién</dt>
              <dd className="text-headline">{agendaDelEvento?.name ?? "Agenda principal"}</dd>
              <dt className="text-text-soft">Tipo</dt>
              <dd className="text-headline">
                {tipoDelEvento ? `${tipoDelEvento.name}${tipoDelEvento.duration_minutes ? ` · ${etiquetaDeDuracion(tipoDelEvento.duration_minutes)}` : ""}` : "Sin tipo"}
              </dd>
              <dt className="text-text-soft">Correo</dt>
              <dd className="break-all text-headline">{event.attendee_email || <span className="text-text-soft">Sin correo</span>}</dd>
              <dt className="text-text-soft">Notas</dt>
              <dd className="whitespace-pre-line text-headline">{event.notes || <span className="text-text-soft">Sin notas</span>}</dd>
            </dl>
            {activities.length > 0 && (
              <details className="rounded-md border border-border-soft px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-headline">Historial ({activities.length})</summary>
                <ul className="mt-3 flex flex-col gap-2">
                  {activities.map((a, i) => (
                    <li key={i} className="flex flex-wrap justify-between gap-2 text-sm">
                      <span className="text-body">
                        {ACCION[a.action] ?? a.action} {a.actor === "panel" ? "desde el panel" : "con tu agente"}
                      </span>
                      <span className="text-text-soft">{formatDateTime(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <FormFeedback error={status.error} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  const opcionesHora = opcionesDeHora(15, 6, 22, hora);
  const titulo = isNew ? (isBlock ? "Nuevo bloqueo" : "Nueva cita") : isBlock ? "Bloqueo" : `Editar la cita de ${event?.title ?? "cliente"}`;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        title={titulo}
        description={isBlock ? "Horas en que tu agente no agenda: almuerzo, vacaciones, una reunión." : undefined}
      >
        {isNew && (
          <SegmentedControl
            label="Qué crear"
            className="mb-5 w-fit"
            value={queCrear}
            onChange={(v) => {
              setQueCrear(v as QueCrear);
              setStatus({});
            }}
            options={[
              { value: "cita", label: "Cita" },
              { value: "bloqueo", label: "Bloqueo" },
            ]}
          />
        )}
        {isBlock ? (
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              void saveBlock(e.currentTarget);
            }}
            className="flex flex-col gap-4"
          >
            {selectorAgenda("b-agenda")}
            <Field label="Motivo" htmlFor="b-reason" help="Lo ves tú; al cliente no se le dice.">
              <Input id="b-reason" name="reason" placeholder="Almuerzo, vacaciones…" defaultValue={isNew ? "" : event?.title ?? ""} />
            </Field>
            {campoDia}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Desde" htmlFor="b-desde" required>
                <Select id="b-desde" value={hora} onChange={(e) => setHora(e.target.value)}>
                  {opcionesHora.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Hasta" htmlFor="b-hasta" required>
                <Select id="b-hasta" value={horaFin} onChange={(e) => setHoraFin(e.target.value)}>
                  {opcionesDeHora(15, 6, 23, horaFin).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <FormFeedback error={status.error} />
            <div className="flex flex-wrap justify-between gap-2">
              {isNew ? (
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => void deleteBlock()}>
                  Eliminar el bloqueo
                </Button>
              )}
              <Button type="submit" variant="accent" loading={status.loading}>
                {isNew ? "Crear bloqueo" : "Guardar"}
              </Button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e: FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              void saveAppointment(e.currentTarget);
            }}
            className="flex flex-col gap-4"
          >
            <Field label="Cliente" htmlFor="c-title" required>
              <Input id="c-title" name="title" placeholder="Nombre del cliente" defaultValue={event?.title ?? ""} required />
            </Field>
            <Field label="Correo del cliente" htmlFor="c-email" help="Opcional: por aquí le llega la confirmación.">
              <Input id="c-email" name="attendee_email" type="email" autoComplete="off" defaultValue={event?.attendee_email ?? ""} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Tipo de cita" htmlFor="c-type">
                <Select id="c-type" value={tipoId} onChange={(e) => elegirTipo(e.target.value)}>
                  <option value="">Sin tipo</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {selectorAgenda("c-agenda")}
            </div>
            {campoDia}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Hora" htmlFor="c-hora" required>
                <Select id="c-hora" value={hora} onChange={(e) => setHora(e.target.value)}>
                  {opcionesHora.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Duración" htmlFor="c-duracion">
                <Select id="c-duracion" value={String(duracion)} onChange={(e) => setDuracion(Number(e.target.value))}>
                  {opcionesDeDuracion(duracion).map((m) => (
                    <option key={m} value={m}>
                      {etiquetaDeDuracion(m)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Notas" htmlFor="c-notes">
              <Textarea id="c-notes" name="notes" rows={2} defaultValue={event?.notes ?? ""} />
            </Field>
            <div className="flex items-start justify-between gap-4">
              <label htmlFor="c-avisar" className="flex flex-col">
                <span className="text-sm font-medium text-headline">Avisar al cliente</span>
                <span className="text-xs text-text-soft">Por correo y WhatsApp; los colaboradores, por correo.</span>
              </label>
              <Switch id="c-avisar" checked={notify} onCheckedChange={setNotify} />
            </div>
            <FormFeedback error={status.error} />
            <div className="flex flex-wrap justify-between gap-2">
              <Button type="button" variant="ghost" onClick={isNew ? onClose : () => setEditando(false)}>
                {isNew ? "Cancelar" : "Volver"}
              </Button>
              <Button type="submit" variant="accent" loading={status.loading}>
                {isNew ? "Crear cita" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
