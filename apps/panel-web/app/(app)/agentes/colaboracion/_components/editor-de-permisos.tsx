"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { GraphOut } from "@/lib/api/types";
import {
  advertenciasLegibles,
  ciclosDeHandoff,
  conModo,
  hayCambios,
  mensajeDeError,
  MODOS,
  paraGuardar,
  tieneModo,
  type AgenteMin,
  type Permiso,
} from "@/lib/colaboracion";
import { useAction } from "@/lib/use-action";

// El mapa es opcional y de solo lectura: se carga solo cuando lo piden (@xyflow/react pesa).
const MapaDePermisos = dynamic(
  () =>
    import("@/app/(app)/agentes/colaboracion/_components/mapa-de-permisos").then(
      (m) => m.MapaDePermisos,
    ),
  {
    ssr: false,
    loading: () => <p className="text-sm text-soft">Cargando el mapa…</p>,
  },
);

/**
 * Permisos entre agentes como lista accesible (HU-AOS-26): para cada agente, a quién puede pasarle
 * la conversación, encargarle o consultarle. Los ciclos de «pasar la conversación» se avisan antes
 * de guardar; guardar publica una versión nueva de los permisos, que aplica con la próxima versión
 * de cada conexión.
 */
export function EditorDePermisos({
  agentes,
  iniciales,
  puedeEditar,
}: {
  agentes: AgenteMin[];
  iniciales: Permiso[];
  puedeEditar: boolean;
}) {
  const [guardados, setGuardados] = useState<Permiso[]>(iniciales);
  const [permisos, setPermisos] = useState<Permiso[]>(iniciales);
  const [verMapa, setVerMapa] = useState(false);
  const { run, pending } = useAction();
  const nombres = useMemo(
    () => Object.fromEntries(agentes.map((a) => [a.id, a.name])),
    [agentes],
  );
  const ciclos = useMemo(
    () => ciclosDeHandoff(permisos, nombres),
    [permisos, nombres],
  );
  const cambios = hayCambios(guardados, permisos);

  if (agentes.length < 2) {
    return (
      <p className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm text-body">
        Necesitas al menos dos agentes especialistas para que colaboren entre
        sí.
      </p>
    );
  }

  const guardar = () =>
    run(async () => {
      const res = await fetch("/api/a2a/graph", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: paraGuardar(permisos) }),
      });
      const json = (await res.json().catch(() => ({}))) as Partial<GraphOut> & {
        error?: string;
        code?: string;
      };
      if (!res.ok)
        return {
          ok: false,
          status: res.status,
          error: mensajeDeError(json.code, json.error),
        };
      setGuardados(permisos);
      const avisos = advertenciasLegibles(json.warnings ?? [], nombres);
      return {
        ok: true,
        success: json.created
          ? `Permisos guardados${avisos.length ? " (con un ciclo de pasar la conversación)" : ""}. Aplican con la próxima versión de cada conexión.`
          : "No había cambios que guardar.",
      };
    });

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-4" aria-label="Permisos por agente">
        {agentes.map((desde) => (
          <li
            key={desde.id}
            className="rounded-lg border border-border-soft bg-surface p-4"
          >
            <h2 className="font-display text-base font-semibold text-headline">
              {desde.name} puede…
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {agentes
                .filter((hacia) => hacia.id !== desde.id)
                .map((hacia) => (
                  <fieldset key={hacia.id} className="sm:flex sm:items-center">
                    {/* Un `legend` no entra en el flex: flota a la izquierda en pantallas anchas. */}
                    <legend className="mb-1 text-sm font-medium text-body sm:float-left sm:mb-0 sm:w-40 sm:shrink-0">
                      con {hacia.name}
                    </legend>
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {MODOS.map(({ modo, etiqueta }) => {
                        const activo = tieneModo(
                          permisos,
                          desde.id,
                          hacia.id,
                          modo,
                        );
                        return puedeEditar ? (
                          <Checkbox
                            key={modo}
                            id={`permiso-${desde.id}-${hacia.id}-${modo}`}
                            label={etiqueta}
                            checked={activo}
                            disabled={pending}
                            onCheckedChange={(v) =>
                              setPermisos((ps) =>
                                conModo(ps, desde.id, hacia.id, modo, v),
                              )
                            }
                          />
                        ) : (
                          <span key={modo} className="text-sm text-soft">
                            {etiqueta}: {activo ? "sí" : "no"}
                          </span>
                        );
                      })}
                    </div>
                  </fieldset>
                ))}
            </div>
          </li>
        ))}
      </ul>

      <dl className="grid gap-2 text-sm text-soft sm:grid-cols-3">
        {MODOS.map(({ modo, etiqueta, ayuda }) => (
          <div key={modo}>
            <dt className="font-medium text-body">{etiqueta}</dt>
            <dd>{ayuda}</dd>
          </div>
        ))}
      </dl>

      {ciclos.length > 0 && (
        <div
          role="status"
          className="flex gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-body"
        >
          <AlertTriangle
            aria-hidden
            className="mt-0.5 h-4 w-4 shrink-0 text-status-warning-fg"
          />
          <div>
            <p className="font-medium">
              Estos permisos dejan la conversación ir y volver:
            </p>
            <ul className="mt-1 list-disc pl-5">
              {ciclos.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="mt-1">
              Se puede guardar (devolver el cliente es válido), pero el sistema
              corta las idas y vueltas dentro de un mismo mensaje y frena el ir
              y venir entre turnos.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {puedeEditar && (
          <Button
            variant="accent"
            onClick={guardar}
            disabled={!cambios || pending}
          >
            {pending ? "Guardando…" : "Guardar permisos"}
          </Button>
        )}
        {puedeEditar && cambios && !pending && (
          <Button variant="ghost" onClick={() => setPermisos(guardados)}>
            Descartar cambios
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setVerMapa((v) => !v)}
          aria-expanded={verMapa}
        >
          {verMapa ? "Ocultar mapa" : "Ver mapa"}
        </Button>
      </div>

      {verMapa && <MapaDePermisos agentes={agentes} permisos={permisos} />}
    </div>
  );
}
