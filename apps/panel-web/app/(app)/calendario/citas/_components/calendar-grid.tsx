"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type FullCalendar from "@fullcalendar/react";

import FullCalendarReact from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

import { AppointmentPanel } from "./appointment-panel";
import { describeNotification, type ClientNotification } from "./notification";
import { type CalendarEvent, type Tipo } from "./types";
import { useConfirm } from "@/components/ui/confirm";

/**
 * Grilla de agenda tipo Google Calendar (HU-CAL-03): mes/semana/día con
 * arrastrar para mover y estirar para cambiar duración. Citas y bloqueos se
 * pintan por color; al mover una cita se confirma si avisar al cliente y a los
 * colaboradores (el backend envía el correo y valida el choque).
 */
export function CalendarGrid({ tipos, timezone }: { tipos: Tipo[]; timezone: string }) {
  const calRef = useRef<FullCalendar | null>(null);
  const confirm = useConfirm();
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [draft, setDraft] = useState<{ start: string; end: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadEvents = useCallback(
    async (info: { startStr: string; endStr: string }) => {
      const params = new URLSearchParams({ start: info.startStr, end: info.endStr });
      const res = await fetch(`/api/pack/calendar/events?${params.toString()}`);
      if (!res.ok) return [];
      const data = (await res.json()) as { events: CalendarEvent[] };
      return data.events.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: e.color,
        borderColor: e.color,
        extendedProps: e,
      }));
    },
    [],
  );

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
      }
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

  function startCreate(arg: DateClickArg) {
    const end = new Date(arg.date.getTime() + 60 * 60 * 1000);
    setDraft({ start: arg.dateStr, end: end.toISOString() });
  }

  useEffect(() => {
    // Refresco ligero al montar por si el servidor cambió el rango inicial.
    calRef.current?.getApi().updateSize();
  }, []);

  return (
    <>
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
      <div className="rounded-md border p-2">
        <FullCalendarReact
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          locale={esLocale}
          timeZone={timezone}
          height="auto"
          nowIndicator
          editable
          selectable
          dayMaxEvents
          events={loadEvents}
          eventDrop={(info) => void moveEvent(info)}
          eventResize={(info) => void moveEvent(info)}
          eventClick={openDetail}
          dateClick={startCreate}
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
            setNotice(message ?? null);
            calRef.current?.getApi().refetchEvents();
          }}
        />
      )}
    </>
  );
}
