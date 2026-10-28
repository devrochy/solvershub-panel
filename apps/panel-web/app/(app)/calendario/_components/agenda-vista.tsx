"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  agendasVisibles,
  codigoPorDefecto,
  type Borrador,
  type LeyendaAgenda,
  type TipoLeyenda,
} from "@/lib/calendario/agenda";

import { AjustesSheet, esSeccionAjustes, type DatosAjustes, type SeccionAjustes } from "./ajustes-sheet";
import { AppointmentPanel } from "./appointment-panel";
import { BarraAgenda } from "./barra-agenda";
import { CalendarGrid, type DatosDeEventos } from "./calendar-grid";
import { type CalendarEvent, type Tipo } from "./types";

function guardadas(clave: string): string[] | null {
  try {
    const crudo = window.localStorage.getItem(clave);
    const lista = crudo ? (JSON.parse(crudo) as unknown) : null;
    return Array.isArray(lista) ? lista.filter((x): x is string => typeof x === "string") : null;
  } catch {
    return null;
  }
}

/** Próxima hora en punto y una hora de duración, para «Nueva cita» sin elegir un hueco. */
export function borradorProximaHora(ahora = new Date()): Borrador {
  const inicio = new Date(ahora);
  inicio.setMinutes(0, 0, 0);
  inicio.setHours(inicio.getHours() + 1);
  return { start: inicio.toISOString(), end: new Date(inicio.getTime() + 3_600_000).toISOString() };
}

/**
 * Vista única de Agenda (HU-CAL-08): el calendario, las agendas como chips, el panel lateral de
 * citas y el cajón de ajustes (tipos, horario y agendas) en una sola pantalla.
 */
export function AgendaVista({
  tenantId,
  tipos,
  timezone,
  agendas,
  multiActivo,
  ajustes,
  seccionInicial,
  puedeCrear,
}: {
  tenantId: string;
  tipos: Tipo[];
  timezone: string;
  /** Agendas del negocio según `/status` (la grilla las refresca desde `/events`). */
  agendas: LeyendaAgenda[];
  multiActivo: boolean;
  ajustes: DatosAjustes;
  seccionInicial: string | null;
  puedeCrear: boolean;
}) {
  const clave = `agenda-visibles:${tenantId}`;
  const [datos, setDatos] = useState<DatosDeEventos>({});
  const [elegidas, setElegidas] = useState<string[] | null>(null);
  const [seleccion, setSeleccion] = useState<CalendarEvent | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [aviso, setAviso] = useState<{ error?: string; notice?: string }>({});
  const [recargar, setRecargar] = useState(0);
  const [abierto, setAbierto] = useState(esSeccionAjustes(seccionInicial));
  const [seccion, setSeccion] = useState<SeccionAjustes | null>(esSeccionAjustes(seccionInicial) ? seccionInicial : null);

  // Lo que se guardó en este navegador (no se lee en el render para no desalinear la hidratación).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage solo existe en el navegador
    setElegidas(guardadas(clave));
  }, [clave]);

  // Los ajustes cambiaron algo (el servidor volvió a leer): se recarga la grilla y su leyenda.
  const [vistos, setVistos] = useState({ agendas, tipos });
  if (vistos.agendas !== agendas || vistos.tipos !== tipos) {
    setVistos({ agendas, tipos });
    setRecargar((n) => n + 1);
  }

  const todas = useMemo(
    () => (datos.calendars ?? agendas).filter((a) => a.active !== false && a.disponible !== false),
    [datos.calendars, agendas],
  );
  const multi = datos.multi_activo ?? multiActivo;
  const visibles = useMemo(() => agendasVisibles(elegidas, todas.map((a) => a.id)), [elegidas, todas]);
  const leyendaTipos: TipoLeyenda[] = useMemo(
    () =>
      datos.tipos ??
      tipos.map((t) => ({ id: t.id, name: t.name, color: t.color ?? "", codigo: t.codigo || codigoPorDefecto(t.name) })),
    [datos.tipos, tipos],
  );

  const guardar = useCallback(
    (ids: string[]) => {
      setElegidas(ids);
      try {
        window.localStorage.setItem(clave, JSON.stringify(ids));
      } catch {
        /* sin almacenamiento: la elección vale solo para esta sesión */
      }
    },
    [clave],
  );

  function alternar(id: string) {
    const siguiente = visibles.includes(id) ? visibles.filter((v) => v !== id) : [...visibles, id];
    // Nunca queda la grilla sin ninguna agenda: apagar la última no hace nada.
    if (siguiente.length) guardar(siguiente);
  }

  const filtro = multi ? visibles : null;
  const colorPor = multi && visibles.length > 1 ? "agenda" : "tipo";
  const principal = todas.find((a) => a.is_default) ?? todas[0];
  const agendaInicial = visibles.length === 1 ? visibles[0] : principal?.id;
  const hayAjustes = ajustes.tipos !== null || ajustes.horario !== null || ajustes.agendas !== null;

  return (
    <div className="flex flex-col gap-3">
      <BarraAgenda
        agendas={multi ? todas : []}
        visibles={visibles}
        onAlternar={alternar}
        onSolo={(id) => guardar([id])}
        tipos={leyendaTipos}
        puedeCrear={puedeCrear}
        onNueva={() => setBorrador(borradorProximaHora())}
        onAjustes={hayAjustes ? () => setAbierto(true) : null}
      />
      {aviso.error && (
        <p role="alert" className="text-status-danger-fg">
          {aviso.error}
        </p>
      )}
      {aviso.notice && !aviso.error && (
        <p role="status" className="text-sm text-body">
          {aviso.notice}
        </p>
      )}

      <CalendarGrid
        timezone={timezone}
        agendasVisibles={filtro}
        colorPor={colorPor}
        recargar={recargar}
        onAbrir={setSeleccion}
        onHueco={setBorrador}
        onDatos={setDatos}
        onAviso={setAviso}
      />

      {(seleccion || borrador) && (
        <AppointmentPanel
          tipos={tipos}
          agendas={multi ? todas : []}
          agendaInicial={agendaInicial}
          event={seleccion}
          draft={borrador}
          onClose={() => {
            setSeleccion(null);
            setBorrador(null);
          }}
          onSaved={(message) => {
            setSeleccion(null);
            setBorrador(null);
            setAviso({ notice: message });
            setRecargar((n) => n + 1);
          }}
        />
      )}

      {hayAjustes && (
        <AjustesSheet
          abierto={abierto}
          seccion={seccion}
          onSeccion={setSeccion}
          onCerrar={() => {
            setAbierto(false);
            setSeccion(null);
            setRecargar((n) => n + 1);
          }}
          datos={ajustes}
        />
      )}
    </div>
  );
}
