"use client";

import { useState } from "react";
import { Check, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import {
  agruparPorModulo,
  cambiosDeAccion,
  conNivel,
  cuerpoParaGuardar,
  estaAjustada,
  estadoInicial,
  hayCambios,
  mensajeDeErrorAlGuardar,
  NIVELES,
  pistaDePorDefecto,
  restablecida,
  type AccionPolitica,
  type CampoPolitica,
  type EstadoDatos,
  type NivelDato,
  type PoliticaDatos,
} from "@/lib/datos-cliente";
import { cn } from "@/lib/utils";
import { useAction } from "@/lib/use-action";

/**
 * Pestaña «Datos del cliente» (HU-CRM-13): qué datos del cliente pide el agente en cada acción.
 * El dueño elige por dato Requerido, Recomendado o No pedir; «Guardar» manda el estado completo.
 */
export function DatosClienteCard({
  politica,
  error,
  puedeEditar,
}: {
  /** Lo que devolvió el servidor; `null` si no se pudo cargar (se muestra `error`). */
  politica: PoliticaDatos | null;
  error?: string;
  puedeEditar: boolean;
}) {
  if (!politica) {
    return (
      <Card>
        <CardContent role="alert" className="pt-5 text-sm text-status-danger-fg">
          No se pudieron cargar los datos del cliente{error ? `: ${error}` : "."} Recarga la página para intentarlo de nuevo.
        </CardContent>
      </Card>
    );
  }
  return <Editor politica={politica} puedeEditar={puedeEditar} />;
}

function Editor({ politica, puedeEditar }: { politica: PoliticaDatos; puedeEditar: boolean }) {
  const [estado, setEstado] = useState<EstadoDatos>(() => estadoInicial(politica));
  // Tras guardar, la página trae la política nueva: se parte de ella (patrón de React para props → estado).
  const [vista, setVista] = useState(politica);
  if (vista !== politica) {
    setVista(politica);
    setEstado(estadoInicial(politica));
  }
  const { run, pending } = useAction();
  const [herramientas, setHerramientas] = useState(politica.herramientas_del_agente);
  const [vistaHerramientas, setVistaHerramientas] = useState(politica.herramientas_del_agente);
  if (vistaHerramientas !== politica.herramientas_del_agente) {
    setVistaHerramientas(politica.herramientas_del_agente);
    setHerramientas(politica.herramientas_del_agente);
  }

  async function cambiarHerramientas(activo: boolean) {
    setHerramientas(activo);
    await run(async () => {
      const res = await fetch("/api/datos-cliente/politica", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ herramientas_del_agente: activo }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        setHerramientas(!activo);
        const texto = typeof json.error === "string" ? json.error : undefined;
        return { ok: false, status: res.status, error: mensajeDeErrorAlGuardar(res.status, texto) };
      }
      return {
        ok: true,
        success: activo ? "El agente ya puede consultar estos datos." : "El agente dejó de consultar estos datos.",
      };
    });
  }

  const grupos = agruparPorModulo(politica.acciones);
  const sinGuardar = hayCambios(politica, estado);

  async function guardar() {
    await run(async () => {
      const res = await fetch("/api/datos-cliente/politica", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cuerpoParaGuardar(politica, estado)),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (!res.ok) {
        const texto = typeof json.error === "string" ? json.error : undefined;
        return { ok: false, status: res.status, error: mensajeDeErrorAlGuardar(res.status, texto) };
      }
      return { ok: true, success: "Datos del cliente guardados." };
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-base font-semibold text-headline">¿Qué datos pide tu asistente al cliente?</h2>
        <p className="mt-1 max-w-2xl text-sm text-text-soft">
          Elige, para cada acción, qué datos del cliente son imprescindibles, cuáles conviene pedir y cuáles no hace falta
          pedir. Los cambios aplican a las próximas conversaciones.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-start justify-between gap-4 pt-5">
          <div className="min-w-0">
            <p id="herramientas-titulo" className="text-sm font-medium text-headline">
              Que el agente consulte estos datos y el historial del cliente
            </p>
            <p className="mt-1 max-w-xl text-sm text-text-soft">
              El agente verá qué datos faltan antes de pedirlos, y un resumen de lo que el cliente tiene en Ventas, Agenda,
              Suscripciones y Cobranza. Está apagado hasta que lo enciendas; el cambio aplica a las próximas conversaciones.
            </p>
          </div>
          <Switch
            checked={herramientas}
            onCheckedChange={cambiarHerramientas}
            disabled={!puedeEditar || pending}
            aria-label="Que el agente consulte los datos y el historial del cliente"
          />
        </CardContent>
      </Card>

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              title="Tu negocio aún no tiene agentes que pidan datos"
              description="Cuando actives un agente de ventas, agenda, suscripciones o cobranza, aquí podrás ajustar qué le pide al cliente."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {!puedeEditar && (
            <p role="note" className="text-sm text-text-soft">
              Solo puedes ver esta configuración. Para cambiarla, pídele acceso a quien administra el negocio.
            </p>
          )}
          {grupos.map((grupo) => (
            <section key={grupo.modulo} aria-labelledby={`modulo-${grupo.modulo}`} className="flex flex-col gap-3">
              <h3 id={`modulo-${grupo.modulo}`} className="text-sm font-semibold text-headline">
                {grupo.nombre}
              </h3>
              {grupo.acciones.map((accion) => (
                <TarjetaDeAccion
                  key={accion.id}
                  accion={accion}
                  estado={estado[accion.id] ?? {}}
                  puedeEditar={puedeEditar}
                  deshabilitado={pending}
                  ajustada={estaAjustada(politica, estado, accion.id)}
                  cambios={cambiosDeAccion(politica, estado, accion.id)}
                  onNivel={(clave, nivel) => setEstado((e) => conNivel(politica, e, accion.id, clave, nivel))}
                  onRestablecer={() => setEstado((e) => restablecida(politica, e, accion.id))}
                />
              ))}
            </section>
          ))}
          {puedeEditar && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="accent" disabled={pending || !sinGuardar} onClick={guardar}>
                {pending ? "Guardando…" : "Guardar datos del cliente"}
              </Button>
              {sinGuardar && !pending && <span className="text-sm text-text-soft">Tienes cambios sin guardar.</span>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TarjetaDeAccion({
  accion,
  estado,
  puedeEditar,
  deshabilitado,
  ajustada,
  cambios,
  onNivel,
  onRestablecer,
}: {
  accion: AccionPolitica;
  estado: Record<string, NivelDato>;
  puedeEditar: boolean;
  deshabilitado: boolean;
  ajustada: boolean;
  cambios: number;
  onNivel: (clave: string, nivel: NivelDato) => void;
  onRestablecer: () => void;
}) {
  const titulo = `accion-${accion.id}`;
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h4 id={titulo} className="text-sm font-medium text-headline">
            {accion.etiqueta}
            {cambios > 0 && <span className="ml-2 text-xs font-normal text-text-soft">· cambios sin guardar</span>}
          </h4>
          {puedeEditar && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={deshabilitado || !ajustada}
              onClick={onRestablecer}
              aria-label={`Restablecer ${accion.etiqueta}`}
            >
              Restablecer
            </Button>
          )}
        </div>
        <ul aria-labelledby={titulo} className="mt-3 flex flex-col divide-y divide-border-soft">
          {accion.campos.map((campo) => (
            <FilaDeDato
              key={campo.clave}
              accionId={accion.id}
              accionEtiqueta={accion.etiqueta}
              campo={campo}
              nivel={estado[campo.clave] ?? campo.nivel}
              bloqueado={!puedeEditar || deshabilitado || !campo.ajustable}
              onNivel={(nivel) => onNivel(campo.clave, nivel)}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function FilaDeDato({
  accionId,
  accionEtiqueta,
  campo,
  nivel,
  bloqueado,
  onNivel,
}: {
  accionId: string;
  accionEtiqueta: string;
  campo: CampoPolitica;
  nivel: NivelDato;
  bloqueado: boolean;
  onNivel: (nivel: NivelDato) => void;
}) {
  const nombre = `${accionId}__${campo.clave}`;
  const pista = campo.ajustable ? pistaDePorDefecto(campo, nivel) : null;
  const idNota = `${nombre}-nota`;
  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm text-headline">{campo.etiqueta}</p>
        {!campo.ajustable && (
          <p id={idNota} className="flex items-center gap-1 text-xs text-text-soft">
            <Lock aria-hidden className="h-3 w-3" />
            Lo exige el sistema, no se puede cambiar.
          </p>
        )}
        {pista && (
          <p id={idNota} className="text-xs text-text-soft">
            {pista}
          </p>
        )}
      </div>
      <div
        role="radiogroup"
        aria-label={`${campo.etiqueta} (${accionEtiqueta})`}
        aria-describedby={!campo.ajustable || pista ? idNota : undefined}
        className="inline-flex shrink-0 overflow-hidden rounded-md border border-control-border"
      >
        {NIVELES.map((opcion) => {
          const marcado = nivel === opcion.id;
          return (
            <label
              key={opcion.id}
              title={opcion.ayuda}
              className={cn(
                "flex cursor-pointer items-center gap-1 border-l border-control-border px-3 py-2 text-sm first:border-l-0",
                "transition-colors duration-150 has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-focus",
                marcado ? "bg-hover font-medium text-headline" : "text-body hover:text-headline",
                bloqueado && "cursor-not-allowed opacity-60",
              )}
            >
              <input
                type="radio"
                name={nombre}
                value={opcion.id}
                checked={marcado}
                disabled={bloqueado}
                onChange={() => onNivel(opcion.id)}
                className="sr-only"
              />
              {marcado && <Check aria-hidden className="h-3.5 w-3.5" />}
              {opcion.etiqueta}
            </label>
          );
        })}
      </div>
    </li>
  );
}
