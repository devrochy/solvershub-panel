"use client";

import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clock, Shapes, Users } from "lucide-react";

import { EtiquetaDeTipo } from "@/components/domain/tipo-de-cita";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { ListaDeAgendas } from "@/lib/api/types";
import { codigoPorDefecto } from "@/lib/calendario/agenda";

import { BusinessHoursForm } from "./business-hours-form";
import { SeccionAgendas } from "./seccion-agendas";
import { DeleteTypeButton, EditTypeDialog, NewTypeForm, type Responsable, type TipoCita } from "./type-actions";

export type SeccionAjustes = "tipos" | "horario" | "agendas";

export const SECCIONES_AJUSTES: SeccionAjustes[] = ["tipos", "horario", "agendas"];

export function esSeccionAjustes(valor: string | null | undefined): valor is SeccionAjustes {
  return SECCIONES_AJUSTES.includes(valor as SeccionAjustes);
}

/** Lo que cada sección necesita; `null` = la persona no tiene permiso (la sección no se muestra). */
export type DatosAjustes = {
  tipos: (TipoCita & { active?: boolean })[] | null;
  responsables: Responsable[];
  horario: string | null;
  agendas: ListaDeAgendas | null;
  /** Puede crear, editar y eliminar agendas (`pack_calendar:configuracion`). */
  puedeEditarAgendas: boolean;
  /** `?tenant=` pidió otro negocio: conectar guardaría la cuenta en el activo. */
  otroNegocio: boolean;
};

const PLUGIN_ID = "pack_calendar";

/**
 * Cajón de ajustes de Agenda (HU-CAL-08): reemplaza las pestañas Tipos de cita, Horario y
 * Google Calendar. Un índice y, al elegir, el detalle con botón de volver; se abre sin salir
 * del calendario.
 */
export function AjustesSheet({
  abierto,
  seccion,
  onSeccion,
  onCerrar,
  datos,
}: {
  abierto: boolean;
  seccion: SeccionAjustes | null;
  onSeccion: (s: SeccionAjustes | null) => void;
  onCerrar: () => void;
  datos: DatosAjustes;
}) {
  const disponibles: { id: SeccionAjustes; titulo: string; resumen: string; icono: ReactNode }[] = [];
  if (datos.tipos)
    disponibles.push({
      id: "tipos",
      titulo: "Tipos de cita",
      resumen: `${datos.tipos.filter((t) => t.active !== false).length} servicios que el asistente puede agendar`,
      icono: <Shapes className="h-4 w-4" aria-hidden />,
    });
  if (datos.horario !== null)
    disponibles.push({
      id: "horario",
      titulo: "Horario de atención",
      resumen: "Días y horas en que se puede agendar",
      icono: <Clock className="h-4 w-4" aria-hidden />,
    });
  if (datos.agendas)
    disponibles.push({
      id: "agendas",
      titulo: "Agendas",
      resumen: `${datos.agendas.calendars.length} ${datos.agendas.calendars.length === 1 ? "agenda" : "agendas"} · cuentas de Google y elección del cliente`,
      icono: <Users className="h-4 w-4" aria-hidden />,
    });

  const actual = disponibles.find((d) => d.id === seccion) ?? null;

  return (
    <Sheet open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <SheetContent
        title={actual ? actual.titulo : "Ajustes de Agenda"}
        description={actual ? undefined : "Todo lo que configura la agenda, sin salir del calendario."}
        className="sm:max-w-xl"
      >
        {actual ? (
          <div className="flex flex-col gap-4">
            <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={() => onSeccion(null)}>
              <ChevronLeft className="h-4 w-4" aria-hidden /> Todos los ajustes
            </Button>
            <Detalle seccion={actual.id} datos={datos} />
          </div>
        ) : disponibles.length === 0 ? (
          <EmptyState
            title="No tienes permisos para cambiar la agenda"
            description="Pídele a un propietario del negocio acceso a Tipos de cita, Horario o Agendas."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {disponibles.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onSeccion(d.id)}
                  className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <span className="text-text-soft">{d.icono}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-headline">{d.titulo}</span>
                    <span className="block text-sm text-body">{d.resumen}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-text-soft" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detalle({ seccion, datos }: { seccion: SeccionAjustes; datos: DatosAjustes }) {
  if (seccion === "tipos" && datos.tipos) return <SeccionTipos tipos={datos.tipos} responsables={datos.responsables} />;
  if (seccion === "horario" && datos.horario !== null)
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">
          Días y horas en que el asistente puede agendar citas. No cambia cuándo responde el chat: eso es el horario de
          atención de Configuración. Cada agenda puede tener el suyo.
        </p>
        <BusinessHoursForm pluginId={PLUGIN_ID} initialHours={datos.horario} />
      </div>
    );
  if (seccion === "agendas" && datos.agendas)
    return <SeccionAgendas datos={datos.agendas} bloqueado={datos.otroNegocio} puedeEscribir={datos.puedeEditarAgendas} />;
  return null;
}

function SeccionTipos({ tipos, responsables }: { tipos: DatosAjustes["tipos"] & object; responsables: Responsable[] }) {
  const [nuevo, setNuevo] = useState(false);
  const emailDe = (id?: string | null) => responsables.find((r) => r.id === id)?.email;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Servicios que el agente puede agendar. El color y el código distinguen sus citas en el calendario.
      </p>
      {tipos.length === 0 ? (
        <EmptyState title="Sin tipos de cita" description="Crea el primero (ej. Demo, Asesoría) para que el agente agende." />
      ) : (
        <ul className="flex flex-col divide-y divide-border-soft rounded-md border border-border">
          {tipos.map((t) => (
            <li key={t.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <EtiquetaDeTipo tipo={{ name: t.name, color: t.color ?? "", codigo: t.codigo || codigoPorDefecto(t.name) }} />
                <p className="mt-0.5 truncate text-xs text-body">
                  {t.duration_minutes} min · {emailDe(t.responsable_admin_id) ?? "Dueños"}
                  {t.active === false ? " · Inactivo" : ""}
                </p>
              </div>
              <EditTypeDialog tipo={t} responsables={responsables} />
              <DeleteTypeButton typeId={t.id} label={t.name} />
            </li>
          ))}
        </ul>
      )}
      <div>
        {nuevo ? (
          <div className="rounded-md border border-border p-3">
            <NewTypeForm responsables={responsables} />
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setNuevo(true)}>
            Nuevo tipo de cita
          </Button>
        )}
      </div>
    </div>
  );
}
