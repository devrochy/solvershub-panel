"use client";

import { Check, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import {
  agruparPorModulo,
  cambiosDeAccion,
  estaAjustada,
  NIVELES,
  pistaDePorDefecto,
  type AgenteDatos,
  type AccionPolitica,
  type CampoPolitica,
  type EstadoDatos,
  type NivelDato,
} from "@/lib/datos-cliente";
import { cn } from "@/lib/utils";

/**
 * Paso «Datos del cliente» del editor de un agente especialista (HU-CRM-28): qué datos pide ESE
 * agente en cada operación que puede ejecutar. El estado y el guardado viven en el editor; este
 * componente solo lo presenta.
 */
export function DatosDelAgente({
  politica,
  estado,
  guardado,
  herramientas,
  puedeEditar,
  guardando,
  sinGuardar,
  onNivel,
  onRestablecer,
  onHerramientas,
  onGuardar,
}: {
  politica: AgenteDatos;
  estado: EstadoDatos;
  guardado: EstadoDatos;
  herramientas: boolean;
  puedeEditar: boolean;
  guardando: boolean;
  sinGuardar: boolean;
  onNivel: (accionId: string, clave: string, nivel: NivelDato) => void;
  onRestablecer: (accionId: string) => void;
  onHerramientas: (activo: boolean) => void;
  onGuardar: () => void;
}) {
  const grupos = agruparPorModulo(politica.acciones);
  const procedimientos = politica.procedimientos ?? [];
  const bloqueado = !puedeEditar || guardando;
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-base font-semibold text-headline">¿Qué datos pide este agente?</h2>
        <p className="mt-1 max-w-2xl text-sm text-text-soft">
          Elige, para cada operación de este agente, qué datos son imprescindibles, cuáles conviene pedir y cuáles no
          hace falta pedir. Se aplica a las próximas conversaciones de este agente, sin publicar una versión nueva.
        </p>
      </div>

      <Card>
        <CardContent className="flex items-start justify-between gap-4 pt-5">
          <div className="min-w-0">
            <p id="herramientas-titulo" className="text-sm font-medium text-headline">
              Que este agente consulte los datos y el historial del cliente
            </p>
            <p className="mt-1 max-w-xl text-sm text-text-soft">
              El agente verá qué datos faltan antes de pedirlos y un resumen de lo que el cliente tiene en sus módulos.
              Está apagado hasta que lo enciendas.
            </p>
          </div>
          <Switch
            checked={herramientas}
            onCheckedChange={onHerramientas}
            disabled={bloqueado}
            aria-label="Que este agente consulte los datos y el historial del cliente"
          />
        </CardContent>
      </Card>

      {grupos.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <EmptyState
              title="Este agente no pide datos en sus operaciones"
              description="Cuando enciendas una acción que necesite datos del cliente (un pedido, una cita o una inscripción), aquí podrás elegir qué le pide."
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
                  deshabilitado={guardando}
                  ajustada={estaAjustada(politica, estado, accion.id)}
                  cambios={cambiosDeAccion(politica, estado, accion.id, guardado)}
                  onNivel={(clave, nivel) => onNivel(accion.id, clave, nivel)}
                  onRestablecer={() => onRestablecer(accion.id)}
                />
              ))}
            </section>
          ))}
          {puedeEditar && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="accent" disabled={guardando || !sinGuardar} onClick={onGuardar}>
                {guardando ? "Guardando…" : "Guardar datos del cliente"}
              </Button>
              {sinGuardar && !guardando && <span className="text-sm text-text-soft">Tienes cambios sin guardar.</span>}
            </div>
          )}
        </>
      )}

      {procedimientos.length > 0 && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-headline">Datos que exige cada superpoder</h3>
            <p className="mt-1 max-w-2xl text-sm text-text-soft">
              Estos datos los define el recorrido del superpoder. No se cambian desde esta pantalla: si un superpoder
              los necesita, el agente los pide aunque aquí no aparezcan.
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {procedimientos.map((procedimiento) => (
                <li key={procedimiento.id} className="rounded-md border border-border-soft p-3">
                  <p className="text-sm font-medium text-headline">{procedimiento.titulo}</p>
                  <ul className="mt-1 flex flex-wrap gap-1.5">
                    {procedimiento.datos.map((dato) => (
                      <li
                        key={dato.clave}
                        className="rounded-full border border-border-soft px-2 py-0.5 text-xs text-text-soft"
                      >
                        {dato.etiqueta}
                        {dato.condicion ? ` · ${dato.condicion}` : ""}
                        {dato.obligatorio ? "" : " · condicional"}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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
