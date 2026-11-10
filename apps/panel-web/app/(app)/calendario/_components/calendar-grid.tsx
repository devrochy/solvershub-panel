"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import type FullCalendar from "@fullcalendar/react";

import FullCalendarReact from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateSelectArg, DatesSetArg, EventClickArg, EventContentArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  aEventoDeGrilla,
  borradorDeSeleccion,
  type Borrador,
  type HorarioDeGrilla,
  type LeyendaAgenda,
  type TipoLeyenda,
} from "@/lib/calendario/agenda";
import { toast } from "@/lib/toast-store";
import { zonaHorariaIntl } from "@/lib/calendario/zona-horaria";

import { describeNotification, type ClientNotification } from "./notification";
import { type CalendarEvent } from "./types";

/** Lo que `/events` trae además de las citas: leyenda de tipos y de agendas. */
export type DatosDeEventos = { tipos?: TipoLeyenda[]; calendars?: LeyendaAgenda[]; multi_activo?: boolean };

const VISTAS = [
  { value: "timeGridDay", label: "Día" },
  { value: "timeGridWeek", label: "Semana" },
  { value: "dayGridMonth", label: "Mes" },
];

const PASO: Record<string, string> = { timeGridDay: "Día", timeGridWeek: "Semana", dayGridMonth: "Mes" };

/** Cita en la grilla (AGE-03): el cliente primero y el tipo en palabras; la hora solo si cabe. */
function ContenidoDeCita({ arg }: { arg: EventContentArg }) {
  const p = arg.event.extendedProps as CalendarEvent & { tipoNombre?: string };
  const detalle = p.kind === "block" ? "Bloqueo" : p.tipoNombre;
  if (arg.view.type === "dayGridMonth") {
    return (
      <span className="flex min-w-0 gap-1 px-1 text-xs">
        <span className="shrink-0 tabular-nums text-text-soft">{arg.timeText}</span>
        <span className="truncate font-medium">{arg.event.title}</span>
      </span>
    );
  }
  const minutos = arg.event.start && arg.event.end ? (arg.event.end.getTime() - arg.event.start.getTime()) / 60000 : 30;
  // Cita corta: solo el nombre, que es lo que hay que leer; el tipo está al abrirla.
  if (minutos < 45) {
    return (
      <span className="flex min-w-0 px-1 text-xs leading-4" title={detalle ? `${arg.event.title} · ${detalle}` : arg.event.title}>
        <span className="truncate font-semibold">{arg.event.title}</span>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-col px-1 py-0.5 text-xs leading-4">
      <span className="truncate font-semibold">{arg.event.title}</span>
      {detalle && <span className="truncate text-text-muted">{detalle}</span>}
      <span className="truncate tabular-nums text-text-muted">{arg.timeText}</span>
    </span>
  );
}

/**
 * Grilla de la vista única de Agenda (HU-UX-08, HU-CAL-08, rediseñada en AGE-01..05): su propia
 * barra con piezas del kit (flechas, Hoy, Día/Semana/Mes), solo las horas de trabajo con lo
 * cerrado sombreado y, en el celular, el día. Cada cita lleva el color de su agenda y el nombre
 * del cliente; los bloqueos son franjas rayadas que se arrastran como las citas. Al mover una cita
 * se confirma si avisar al cliente y a los colaboradores (el backend envía el aviso y valida el
 * choque). Las citas y los huecos se abren en el panel lateral de la vista (`onAbrir`/`onHueco`).
 */
export function CalendarGrid({
  timezone,
  horario,
  tiposPorId,
  agendasVisibles,
  recargar,
  anchoCambio,
  extra,
  onAbrir,
  onHueco,
  onDatos,
}: {
  timezone: string;
  horario: HorarioDeGrilla;
  /** Nombre de cada tipo de cita por id, para escribirlo en la cita. */
  tiposPorId: Record<string, string>;
  /** Ids de las agendas a mostrar; `null` = todas (negocio con una sola agenda). */
  agendasVisibles: string[] | null;
  /** Cambia para pedir que se vuelvan a leer los eventos (tras guardar en el panel lateral). */
  recargar: number;
  /** Cambia cuando el ancho disponible cambió (la columna Hoy se mostró u ocultó). */
  anchoCambio: unknown;
  /** Lo que va a la derecha de la barra (agendas, columna Hoy). */
  extra?: ReactNode;
  onAbrir: (evento: CalendarEvent) => void;
  onHueco: (borrador: Borrador) => void;
  onDatos: (datos: DatosDeEventos) => void;
}) {
  const calRef = useRef<FullCalendar | null>(null);
  const confirm = useConfirm();
  const [vista, setVista] = useState({ titulo: "", tipo: "timeGridWeek" });
  // Refs: `events` es una función estable y lee el filtro vigente al pedir cada rango.
  const filtro = useRef({ agendasVisibles, tiposPorId });

  const loadEvents = useCallback(
    async (info: { startStr: string; endStr: string }) => {
      const params = new URLSearchParams({ start: info.startStr, end: info.endStr });
      const { agendasVisibles: ids, tiposPorId: tipos } = filtro.current;
      if (ids) params.set("calendar_ids", ids.join(","));
      const res = await fetch(`/api/pack/calendar/events?${params.toString()}`);
      if (!res.ok) {
        toast.error("No se pudieron cargar las citas. Vuelve a intentarlo en un momento.");
        return [];
      }
      const data = (await res.json()) as DatosDeEventos & { events: CalendarEvent[] };
      onDatos({ tipos: data.tipos, calendars: data.calendars, multi_activo: data.multi_activo });
      const nombres = { ...tipos, ...Object.fromEntries((data.tipos ?? []).map((t) => [t.id, t.name])) };
      return data.events.map((e) => aEventoDeGrilla(e, nombres));
    },
    [onDatos],
  );

  // Cambió qué agendas se ven o hay que recargar: se vuelve a pedir el rango.
  const clave = `${agendasVisibles?.join(",") ?? "*"}|${recargar}`;
  const claveCargada = useRef<string | null>(null);
  useEffect(() => {
    filtro.current = { agendasVisibles, tiposPorId };
    // La primera carga la hace FullCalendar al montar; solo se repite cuando cambia la clave.
    if (claveCargada.current !== null && claveCargada.current !== clave) {
      calRef.current?.getApi().refetchEvents();
    }
    claveCargada.current = clave;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `clave` resume las entradas
  }, [clave]);

  // En el celular, el día: la semana no cabe en 390 px (AGE-02).
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) calRef.current?.getApi().changeView("timeGridDay");
  }, []);

  // FullCalendar no se entera de que su contenedor cambió de ancho al mostrar u ocultar la columna Hoy.
  useEffect(() => {
    calRef.current?.getApi().updateSize();
  }, [anchoCambio]);

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
        toast.error("No se pudo mover el bloqueo.");
        return;
      }
      toast.success("Bloqueo movido.");
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
      toast.error(json.error ?? "Ese horario ya está ocupado o está fuera del horario.");
      return;
    }
    const json = (await res.json().catch(() => ({}))) as { notification?: ClientNotification };
    toast.success(describeNotification("Cita movida.", json.notification));
  }

  function startCreate(arg: DateSelectArg) {
    onHueco(borradorDeSeleccion(arg));
    arg.view.calendar.unselect();
  }

  const api = () => calRef.current?.getApi();
  const paso = PASO[vista.tipo] ?? "Semana";

  return (
    <section aria-label="Calendario" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" aria-label={`${paso} anterior`} onClick={() => api()?.prev()} className="shrink-0 pointer-coarse:h-11 pointer-coarse:w-11">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="outline" size="icon" aria-label={`${paso} siguiente`} onClick={() => api()?.next()} className="shrink-0 pointer-coarse:h-11 pointer-coarse:w-11">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
          <Button variant="ghost" onClick={() => api()?.today()} className="shrink-0">
            Hoy
          </Button>
          <h2 className="min-w-0 font-display text-sh-block text-headline sm:truncate" aria-live="polite">
            {vista.titulo}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extra}
          <SegmentedControl label="Vista del calendario" options={VISTAS} value={vista.tipo} onChange={(v) => api()?.changeView(v)} />
        </div>
      </div>
      <div className="agenda-grilla rounded-lg border border-border-soft bg-surface p-2">
        <FullCalendarReact
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, zonaHorariaIntl]}
          initialView="timeGridWeek"
          headerToolbar={false}
          locale={esLocale}
          timeZone={timezone}
          height="auto"
          slotMinTime={horario.slotMinTime}
          slotMaxTime={horario.slotMaxTime}
          scrollTime={horario.scrollTime}
          businessHours={horario.businessHours}
          allDaySlot={false}
          nowIndicator
          editable
          selectable
          selectMirror
          dayMaxEvents
          events={loadEvents}
          eventContent={(arg) => <ContenidoDeCita arg={arg} />}
          datesSet={(arg: DatesSetArg) => setVista({ titulo: arg.view.title, tipo: arg.view.type })}
          eventDrop={(info) => void moveEvent(info)}
          eventResize={(info) => void moveEvent(info)}
          eventClick={(arg: EventClickArg) => onAbrir(arg.event.extendedProps as CalendarEvent)}
          select={startCreate}
        />
      </div>
    </section>
  );
}
