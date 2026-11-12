"use client";

import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputNumero } from "@/components/ui/input-numero";
import { Switch } from "@/components/ui/switch";
import { MAX_TOPE, TOPE_SUGERIDO, resumenDeAccion, type AccionEnEditor } from "@/lib/acciones-del-agente";
import { agruparAcciones, nombreDeAccion } from "@/lib/grupos-de-acciones";

function ErrorDeAccion({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-sm text-status-danger-fg">
      <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
      {mensaje}
    </p>
  );
}

/** Id seguro para el DOM a partir del nombre de la acción (solo letras, números y `_`, ACTION_PATTERN). */
const idDe = (tool: string) => `accion-${tool}`;

/**
 * Pestaña «Acciones» del editor (fase 5a de la SPEC «habilidades por agente», ADR-0190 en preparación):
 * las acciones del agente agrupadas por lo que hacen, y por cada una encendido, tope por conversación y
 * si pide confirmación. Los cambios van al borrador; se publican como el resto del agente.
 */
export function AccionesDelAgente({
  acciones,
  cambiar,
  erroresPorAccion = {},
  errores = [],
  conConocimiento = false,
  soloLectura = false,
  gruposDeLaApi = {},
}: {
  acciones: Record<string, AccionEnEditor>;
  cambiar: (acciones: Record<string, AccionEnEditor>) => void;
  /** Errores de la API junto a cada acción (p. ej. una acción que ya no existe). */
  erroresPorAccion?: Record<string, string>;
  /** Errores de las acciones que no son de una sola (p. ej. una acción repetida). */
  errores?: string[];
  /** El agente busca en los documentos del negocio: se explica dónde se controla. */
  conConocimiento?: boolean;
  soloLectura?: boolean;
  /** Grupo de cada acción según la API (`group` de `GET /admin/agents/{id}/actions`); la que no esté se agrupa por su nombre. */
  gruposDeLaApi?: Record<string, string>;
}) {
  function poner(tool: string, cambio: Partial<AccionEnEditor>) {
    cambiar({ ...acciones, [tool]: { ...acciones[tool], ...cambio } });
  }

  const grupos = agruparAcciones(Object.keys(acciones).map((tool) => ({ tool, grupo: gruposDeLaApi[tool] })));
  const nota = conConocimiento && (
    <p className="text-sm text-text-soft">
      La búsqueda en tus documentos se enciende y se ajusta en el paso «Memoria y conocimiento».
    </p>
  );

  if (grupos.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-body">Este agente todavía no tiene acciones. Las trae la plantilla con la que lo creaste.</p>
        {nota}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-body">
        Esto es lo que el agente puede hacer por tus clientes. Apaga lo que no quieras que haga, ponle un tope de veces por
        conversación o pide que el cliente confirme antes: cuando la usa fuera de un superpoder, primero le pregunta.
      </p>
      {errores.map((mensaje, i) => (
        <ErrorDeAccion key={mensaje} id={`acciones-error-${i}`} mensaje={mensaje} />
      ))}
      {nota}
      {grupos.map(({ grupo, acciones: delGrupo }) => (
        <section key={grupo.id} aria-labelledby={`grupo-${grupo.id}`} className="flex flex-col gap-3">
          <div>
            <h3 id={`grupo-${grupo.id}`} className="font-display text-base font-semibold text-headline">
              {grupo.titulo}
            </h3>
            {grupo.descripcion && <p className="text-sm text-text-soft">{grupo.descripcion}</p>}
          </div>
          <ul className="flex flex-col gap-3">
            {delGrupo.map(({ tool }) => {
              const accion = acciones[tool];
              const id = idDe(tool);
              const nombre = nombreDeAccion(tool);
              const error = erroresPorAccion[tool];
              if (accion.quitada) {
                return (
                  <li key={tool} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-border-soft p-4">
                    <p className="text-sm text-text-soft">
                      <span className="text-headline line-through">{nombre}</span>: se quita al guardar.
                    </p>
                    <Button type="button" variant="outline" size="sm" disabled={soloLectura} onClick={() => poner(tool, { quitada: false })}>
                      Deshacer
                    </Button>
                  </li>
                );
              }
              return (
                <li key={tool} className="rounded-md border border-border-soft p-4">
                  <div className="flex items-start gap-3">
                    <Switch
                      id={id}
                      aria-label={nombre}
                      checked={accion.activo}
                      disabled={soloLectura}
                      onCheckedChange={(activo) => poner(tool, { activo })}
                    />
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <label htmlFor={id} className="text-sm font-medium text-headline">
                        {nombre}
                      </label>
                      <p className="text-sm text-text-soft">{resumenDeAccion(accion)}</p>
                    </div>
                  </div>
                  {error && (
                    <div className="mt-3 flex flex-col gap-2 pl-12">
                      <ErrorDeAccion id={`${id}-error`} mensaje={error} />
                      <div>
                        <Button type="button" variant="outline" size="sm" disabled={soloLectura} onClick={() => poner(tool, { quitada: true })}>
                          Quitar del agente
                        </Button>
                      </div>
                    </div>
                  )}
                  {accion.activo && !soloLectura && (
                    <div className="mt-3 flex flex-col gap-3 pl-12">
                      <div className="flex flex-wrap items-center gap-3">
                        <Checkbox
                          id={`${id}-con-tope`}
                          label="Ponerle un tope por conversación"
                          checked={accion.tope !== null}
                          onCheckedChange={(conTope) => poner(tool, { tope: conTope ? TOPE_SUGERIDO : null })}
                        />
                        {accion.tope !== null && (
                          <span className="flex items-center gap-2 text-sm text-body">
                            <InputNumero
                              id={`${id}-tope`}
                              aria-label={`Veces por conversación para ${nombre}`}
                              min={1}
                              max={MAX_TOPE}
                              value={accion.tope}
                              onValueChange={(tope) => poner(tool, { tope })}
                              className="w-24"
                            />
                            veces como máximo
                          </span>
                        )}
                      </div>
                      <Checkbox
                        id={`${id}-confirmar`}
                        label="Pedir confirmación antes de hacerla"
                        checked={accion.confirmar}
                        onCheckedChange={(confirmar) => poner(tool, { confirmar })}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
