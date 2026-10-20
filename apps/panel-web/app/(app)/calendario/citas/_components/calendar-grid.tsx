"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type FullCalendar from "@fullcalendar/react";

import FullCalendarReact from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

import { LeyendaDeTipos } from "@/components/domain/tipo-de-cita";
import { useConfirm } from "@/components/ui/confirm";
import { aEventoDeGrilla, borradorDeSeleccion, codigoPorDefecto, type Borrador, type TipoLeyenda } from "@/lib/calendario/agenda";
import { zonaHorariaIntl } from "@/lib/calendario/zona-horaria";

import { AppointmentPanel } from "./appointment-panel";
import { describeNotification, type ClientNotification } from "./notification";
import { type CalendarEvent, type Tipo } from "./types";

/**
 * Portada de Agenda (HU-UX-08, sobre HU-CAL-03): semana tipo Google Calendar. Cada cita
 * lleva el color y el código de su tipo (leyenda arriba); los bloqueos son franjas rayadas
 * que se arrastran como las citas. Al elegir un hueco, el panel lateral pregunta si es una
 * cita o un bloqueo y lo crea sin salir de la vista. Al mover una cita se confirma si avisar
 * al cliente y a los colaboradores (el backend envía el aviso y valida el choque).
 */
export function CalendarGrid({ tipos, timezone }: { tipos: Tipo[]; timezone: string }) {
  const calRef = useRef<FullCalendar | null>(null);
  const confirm = useConfirm();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [draft, setDraft] = useState<Borrador | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // La leyenda sale de `/events` (quien ve el calendario no necesita el permiso de Tipos);
  // mientras carga, de los tipos que trajo la página.
  const [leyenda, setLeyenda] = useState<TipoLeyenda[]>(() =>
    tipos.map((t) => ({ id: t.id, name: t.name, color: t.color ?? "", codigo: t.codigo || codigoPorDefecto(t.name) })),
  );

  const loadEvents = useCallback(async (info: { startStr: string; endStr: string }) => {
    const params = new URLSearchParams({ start: info.startStr, end: info.endStr });
    const res = await fetch(`/api/pack/calendar/events?${params.toString()}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { events: CalendarEvent[]; tipos?: TipoLeyenda[] };
    if (data.tipos) setLeyenda(data.tipos);
    return data.events.map(aEventoDeGrilla);
  }, []);

  async function moveEvent(info: EventDropArg | EventResizeDoneArg) {
    const p = info.event.extendedProps as CalendarEvent;
    const revert = () => info.revert();
    if (p.kind === "block") {
      const res = await fetch(`/api/pack/calendar/blocks/${p.id.replace("block-", "")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start_at: info.event.start?.toISOString(),
          end_at: info.event.end?.toISOString(),
        }),
      });
      if (!res.ok) {
        revert();
        setError("No se pudo mover el bloqueo.");
        return;
      }
      setError(null);
      setNotice("Bloqueo movido.");
      return;
    }
    const id = p.id.replace("appt-", "");
    const avisar = await confirm({
      title: "Avisar del nuevo horario",
      description:
        "¿Avisar al cliente del nuevo horario por correo y WhatsApp (y a los colaboradores por correo)?",
      confirmLabel: "Sí, avisar",
      cancelLabel: "No avisar",
      destructive: false,
    });
    const res = await fetch(`/api/pack/calendar/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        start_at: info.event.start?.toISOString(),
        end_at: info.event.end?.toISOString(),
        notify: avisar,
      }),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      revert();
      setError(json.error ?? "Ese horario ya está ocupado o está fuera del horario.");
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { notification?: ClientNotification };
    setError(null);
    setNotice(describeNotification("Cita movida.", json.notification));
  }

  function openDetail(arg: EventClickArg) {
    setSelected(arg.event.extendedProps as CalendarEvent);
  }

  function startCreate(arg: DateSelectArg) {
    setDraft(borradorDeSeleccion(arg));
    arg.view.calendar.unselect();
  }

  useEffect(() => {
    // Refresco ligero al montar por si el servidor cambió el rango inicial.
    calRef.current?.getApi().updateSize();
  }, []);

  return (
    <>
      <LeyendaDeTipos tipos={leyenda} />
      {error && (
        <p role="alert" className="text-status-danger-fg">
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="text-sm text-body">
          {notice}
        </p>
      )}
      <div className="agenda-grilla rounded-md border border-border bg-surface p-2">
        <FullCalendarReact
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, zonaHorariaIntl]}
          initialView="timeGridWeek"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale={esLocale}
          // Los íconos de anterior/siguiente son `role="img"` sin nombre (axe: role-img-alt).
          buttonIcons={false}
          buttonText={{ prev: "Anterior", next: "Siguiente" }}
          timeZone={timezone}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          scrollTime="08:00:00"
          allDaySlot={false}
          nowIndicator
          editable
          selectable
          selectMirror
          dayMaxEvents
          events={loadEvents}
          eventDrop={(info) => void moveEvent(info)}
          eventResize={(info) => void moveEvent(info)}
          eventClick={openDetail}
          select={startCreate}
        />
      </div>

      {(selected || draft) && (
        <AppointmentPanel
          tipos={tipos}
          event={selected}
          draft={draft}
          onClose={() => {
            setSelected(null);
            setDraft(null);
          }}
          onSaved={(message) => {
            setSelected(null);
            setDraft(null);
            setError(null);
            setNotice(message ?? null);
            calRef.current?.getApi().refetchEvents();
          }}
        />
      )}
    </>
  );
}
