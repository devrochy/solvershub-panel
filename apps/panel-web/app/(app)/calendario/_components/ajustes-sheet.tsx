"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs } from "@/components/ui/tabs";
import type { ListaDeAgendas } from "@/lib/api/types";
import { etiquetaDeDuracion } from "@/lib/calendario/formulario";

import { BusinessHoursForm } from "./business-hours-form";
import { SeccionAgendas } from "./seccion-agendas";
import { MenuTipo, quienAtiende, TipoDialog, type Responsable, type TipoCita } from "./type-actions";

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
 * Cajón de ajustes de Agenda (HU-CAL-08, rediseñado en AGE-08): una sola navegación, pestañas
 * Tipos de cita, Horario y Agendas; se abre sin salir del calendario y en la pestaña que pide
 * `?ajustes=`. Solo aparecen las pestañas que la persona puede ver.
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
  const pestanas = [
    datos.tipos ? { id: "tipos", label: "Tipos de cita" } : null,
    datos.horario !== null ? { id: "horario", label: "Horario" } : null,
    datos.agendas ? { id: "agendas", label: "Agendas" } : null,
  ].filter((p): p is { id: SeccionAjustes; label: string } => p !== null);
  const actual = pestanas.find((p) => p.id === seccion)?.id ?? pestanas[0]?.id ?? null;

  return (
    <Sheet open={abierto} onOpenChange={(o) => !o && onCerrar()}>
      <SheetContent title="Ajustes de la Agenda" className="sm:max-w-xl">
        {pestanas.length === 0 || !actual ? (
          <EmptyState
            title="No tienes permiso para cambiar la Agenda"
            description="Pídele a un propietario del negocio acceso a Tipos de cita, Horario o Agendas."
          />
        ) : (
          <div className="flex flex-col gap-5">
            <Tabs items={pestanas} value={actual} onValueChange={(id) => onSeccion(id as SeccionAjustes)} />
            <div role="tabpanel" aria-label={pestanas.find((p) => p.id === actual)?.label}>
              <Detalle seccion={actual} datos={datos} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detalle({ seccion, datos }: { seccion: SeccionAjustes; datos: DatosAjustes }) {
  if (seccion === "tipos" && datos.tipos) return <SeccionTipos tipos={datos.tipos} responsables={datos.responsables} />;
  if (seccion === "horario" && datos.horario !== null)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-body">
          Cuándo puede agendar tu agente. Cada agenda puede tener el suyo; este es el que usan las que no lo cambian. No
          cambia cuándo responde el chat: eso está en Configuración.
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
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-body">Los servicios que tu agente puede agendar.</p>
        <Button variant="outline" onClick={() => setNuevo(true)}>
          Nuevo tipo
        </Button>
      </div>
      {tipos.length === 0 ? (
        <EmptyState title="Todavía no hay tipos de cita" description="Crea el primero (una valoración, una asesoría) para que tu agente agende." />
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-lg border border-border-soft">
          {tipos.map((t) => (
            <li key={t.id} className="flex items-center gap-3 border-t border-border-soft px-4 py-3 first:border-t-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-headline">{t.name}</p>
                <p className="truncate text-xs text-text-soft">
                  {etiquetaDeDuracion(t.duration_minutes)} · {quienAtiende(t, responsables)}
                  {t.active === false ? " · Inactivo" : ""}
                </p>
              </div>
              <MenuTipo tipo={t} responsables={responsables} />
            </li>
          ))}
        </ul>
      )}
      <TipoDialog responsables={responsables} abierto={nuevo} onAbiertoChange={setNuevo} />
    </div>
  );
}
