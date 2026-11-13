"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { parseBusinessHours } from "@/lib/business-hours";
import { agendasVisibles, horarioAGrilla, type Borrador, type LeyendaAgenda } from "@/lib/calendario/agenda";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

import { AjustesSheet, esSeccionAjustes, type DatosAjustes, type SeccionAjustes } from "./ajustes-sheet";
import { AppointmentPanel } from "./appointment-panel";
import { BarraAgenda } from "./barra-agenda";
import { CalendarGrid, type DatosDeEventos } from "./calendar-grid";
import { ListaDeHoy } from "./lista-de-hoy";
import { type CalendarEvent, type Tipo } from "./types";

function leer<T>(clave: string, valida: (v: unknown) => v is T): T | null {
  try {
    const crudo = window.localStorage.getItem(clave);
    const valor = crudo ? (JSON.parse(crudo) as unknown) : null;
    return valida(valor) ? valor : null;
  } catch {
    return null;
  }
}

function escribir(clave: string, valor: unknown) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento: la elección vale solo para esta sesión */
  }
}

const esListaDeTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const esBooleano = (v: unknown): v is boolean => typeof v === "boolean";

/** Próxima hora en punto y una hora de duración, para «Nueva cita» sin elegir un hueco. */
export function borradorProximaHora(ahora = new Date()): Borrador {
  const inicio = new Date(ahora);
  inicio.setMinutes(0, 0, 0);
  inicio.setHours(inicio.getHours() + 1);
  return { start: inicio.toISOString(), end: new Date(inicio.getTime() + 3_600_000).toISOString() };
}

/**
 * Vista única de Agenda (HU-CAL-08, rediseñada en AGE-00A): la cabecera con Ajustes y Nueva cita,
 * la columna de las citas de hoy (se muestra u oculta y se recuerda en este navegador), el
 * calendario con sus agendas, el panel lateral de la cita y el cajón de ajustes.
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
  avisos,
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
  /** Lo que va entre la cabecera y el calendario (datos de prueba, sin agendas). */
  avisos?: ReactNode;
}) {
  const claveAgendas = `agenda-visibles:${tenantId}`;
  const claveHoy = `agenda-hoy:${tenantId}`;
  const [datos, setDatos] = useState<DatosDeEventos>({});
  const [elegidas, setElegidas] = useState<string[] | null>(null);
  const [hoyVisible, setHoyVisible] = useState(true);
  const [seleccion, setSeleccion] = useState<CalendarEvent | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [recargar, setRecargar] = useState(0);
  const [abierto, setAbierto] = useState(esSeccionAjustes(seccionInicial));
  const [seccion, setSeccion] = useState<SeccionAjustes | null>(esSeccionAjustes(seccionInicial) ? seccionInicial : null);

  // Lo que se guardó en este navegador (no se lee en el render para no desalinear la hidratación).
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- localStorage solo existe en el navegador */
    setElegidas(leer(claveAgendas, esListaDeTextos));
    setHoyVisible(leer(claveHoy, esBooleano) ?? true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [claveAgendas, claveHoy]);

  // Los ajustes cambiaron algo (el servidor volvió a leer): se recarga la grilla.
  const [vistos, setVistos] = useState({ agendas, tipos, horario: ajustes.horario });
  if (vistos.agendas !== agendas || vistos.tipos !== tipos || vistos.horario !== ajustes.horario) {
    setVistos({ agendas, tipos, horario: ajustes.horario });
    setRecargar((n) => n + 1);
  }

  const todas = useMemo(
    () => (datos.calendars ?? agendas).filter((a) => a.active !== false && a.disponible !== false),
    [datos.calendars, agendas],
  );
  const multi = datos.multi_activo ?? multiActivo;
  const visibles = useMemo(() => agendasVisibles(elegidas, todas.map((a) => a.id)), [elegidas, todas]);
  const tiposPorId = useMemo(() => Object.fromEntries(tipos.map((t) => [t.id, t.name])), [tipos]);
  const horario = useMemo(() => horarioAGrilla(parseBusinessHours(ajustes.horario ?? "")), [ajustes.horario]);

  const guardarAgendas = useCallback(
    (ids: string[]) => {
      setElegidas(ids);
      escribir(claveAgendas, ids);
    },
    [claveAgendas],
  );

  function alternar(id: string) {
    const siguiente = visibles.includes(id) ? visibles.filter((v) => v !== id) : [...visibles, id];
    // Nunca queda la grilla sin ninguna agenda: apagar la última no hace nada.
    if (siguiente.length) guardarAgendas(siguiente);
  }

  function alternarHoy() {
    setHoyVisible((v) => {
      escribir(claveHoy, !v);
      return !v;
    });
  }

  const filtro = multi ? visibles : null;
  const principal = todas.find((a) => a.is_default) ?? todas[0];
  const agendaInicial = visibles.length === 1 ? visibles[0] : principal?.id;
  const hayAjustes = ajustes.tipos !== null || ajustes.horario !== null || ajustes.agendas !== null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Agenda"
        description="Las citas de tu negocio y quién las atiende."
        helpSection="agenda"
        actions={
          <>
            {hayAjustes && (
              <Button variant="outline" onClick={() => setAbierto(true)}>
                <Settings2 className="h-4 w-4" aria-hidden /> Ajustes
              </Button>
            )}
            {puedeCrear && (
              <Button variant="accent" onClick={() => setBorrador(borradorProximaHora())}>
                <Plus className="h-4 w-4" aria-hidden /> Nueva cita
              </Button>
            )}
          </>
        }
      />

      {avisos}

      <div className={cn("grid items-start gap-4", hoyVisible && "lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]")}>
        {hoyVisible && (
          <div className="max-lg:hidden lg:sticky lg:top-4">
            <ListaDeHoy
              timezone={timezone}
              agendas={todas}
              agendasVisibles={filtro}
              tiposPorId={tiposPorId}
              recargar={recargar}
              onAbrir={setSeleccion}
              onCambio={() => setRecargar((n) => n + 1)}
            />
          </div>
        )}
        <CalendarGrid
          timezone={timezone}
          horario={horario}
          tiposPorId={tiposPorId}
          agendasVisibles={filtro}
          recargar={recargar}
          anchoCambio={hoyVisible}
          extra={
            <BarraAgenda
              agendas={multi ? todas : []}
              visibles={visibles}
              onAlternar={alternar}
              onVerTodas={() => guardarAgendas(todas.map((a) => a.id))}
              hoyVisible={hoyVisible}
              onHoy={alternarHoy}
            />
          }
          onAbrir={setSeleccion}
          onHueco={setBorrador}
          onDatos={setDatos}
        />
      </div>

      {(seleccion || borrador) && (
        <AppointmentPanel
          tipos={tipos}
          agendas={multi ? todas : []}
          todasLasAgendas={todas}
          agendaInicial={agendaInicial}
          timezone={timezone}
          event={seleccion}
          draft={borrador}
          onClose={() => {
            setSeleccion(null);
            setBorrador(null);
          }}
          onSaved={(message) => {
            setSeleccion(null);
            setBorrador(null);
            if (message) toast.success(message);
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
