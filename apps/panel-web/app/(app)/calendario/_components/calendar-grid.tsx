"use client";

import { useCallback, useEffect, useRef } from "react";
import type FullCalendar from "@fullcalendar/react";

import FullCalendarReact from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

import { useConfirm } from "@/components/ui/confirm";
import {
  aEventoDeGrilla,
  borradorDeSeleccion,
  type Borrador,
  type ColorPor,
  type LeyendaAgenda,
  type TipoLeyenda,
} from "@/lib/calendario/agenda";
import { zonaHorariaIntl } from "@/lib/calendario/zona-horaria";

import { describeNotification, type ClientNotification } from "./notification";
import { type CalendarEvent } from "./types";

/** Lo que `/events` trae además de las citas: leyenda de tipos y de agendas. */
export type DatosDeEventos = { tipos?: TipoLeyenda[]; calendars?: LeyendaAgenda[]; multi_activo?: boolean };

/**
 * Grilla de la vista única de Agenda (HU-UX-08, HU-CAL-08): semana tipo Google Calendar. Cada
 * cita lleva el color y el código de su tipo, o el color de su agenda si se ven varias; los
 * bloqueos son franjas rayadas que se arrastran como las citas. Al mover una cita se
 * confirma si avisar al cliente y a los colaboradores (el backend envía el aviso y valida el
 * choque). Las citas y los huecos se abren en el panel lateral de la vista (`onAbrir`/`onHueco`).
 */
export function CalendarGrid({
  timezone,
  agendasVisibles,
  colorPor,
  recargar,
  onAbrir,
  onHueco,
  onDatos,
  onAviso,
}: {
  timezone: string;
  /** Ids de las agendas a mostrar; `null` = todas (negocio con una sola agenda). */
  agendasVisibles: string[] | null;
  colorPor: ColorPor;
  /** Cambia para pedir que se vuelvan a leer los eventos (tras guardar en el panel lateral). */
  recargar: number;
  onAbrir: (evento: CalendarEvent) => void;
  onHueco: (borrador: Borrador) => void;
  onDatos: (datos: DatosDeEventos) => void;
  onAviso: (aviso: { error?: string; notice?: string }) => void;
}) {
  const calRef = useRef<FullCalendar | null>(null);
  const confirm = useConfirm();
  // Refs: `events` es una función estable y lee el filtro vigente al pedir cada rango.
  const filtro = useRef({ agendasVisibles, colorPor });

  const loadEvents = useCallback(
    async (info: { startStr: string; endStr: string }) => {
      const params = new URLSearchParams({ start: info.startStr, end: info.endStr });
      const { agendasVisibles: ids, colorPor: color } = filtro.current;
      if (ids) params.set("calendar_ids", ids.join(","));
      const res = await fetch(`/api/pack/calendar/events?${params.toString()}`);
      if (!res.ok) return [];
      const data = (await res.json()) as DatosDeEventos & { events: CalendarEvent[] };
      onDatos({ tipos: data.tipos, calendars: data.calendars, multi_activo: data.multi_activo });
      return data.events.map((e) => aEventoDeGrilla(e, color));
    },
    [onDatos],
  );

  // Cambió qué agendas se ven, el color o hay que recargar: se vuelve a pedir el rango.
  const clave = `${agendasVisibles?.join(",") ?? "*"}|${colorPor}|${recargar}`;
  const claveCargada = useRef<string | null>(null);
  useEffect(() => {
    filtro.current = { agendasVisibles, colorPor };
    // La primera carga la hace FullCalendar al montar; solo se repite cuando cambia la clave.
    if (claveCargada.current !== null && claveCargada.current !== clave) {
      calRef.current?.getApi().refetchEvents();
    }
    claveCargada.current = clave;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume las tres entradas
  }, [clave]);

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
        onAviso({ error: "No se pudo mover el bloqueo." });
        return;
      }
      onAviso({ notice: "Bloqueo movido." });
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
      onAviso({ error: json.error ?? "Ese horario ya está ocupado o está fuera del horario." });
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { notification?: ClientNotification };
    onAviso({ notice: describeNotification("Cita movida.", json.notification) });
  }

  function startCreate(arg: DateSelectArg) {
    onHueco(borradorDeSeleccion(arg));
    arg.view.calendar.unselect();
  }

  useEffect(() => {
    // Refresco ligero al montar por si el servidor cambió el rango inicial.
    calRef.current?.getApi().updateSize();
  }, []);

  return (
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
        eventClick={(arg: EventClickArg) => onAbrir(arg.event.extendedProps as CalendarEvent)}
        select={startCreate}
      />
    </div>
  );
}
