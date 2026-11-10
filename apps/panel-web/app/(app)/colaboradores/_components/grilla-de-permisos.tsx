"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CollaboratorItem } from "@/lib/api/types";
import { gruposDePermisos, permisosAGuardar } from "@/lib/colaboradores";
import { useAction } from "@/lib/use-action";

const NIVELES = [
  { value: "none", label: "Sin acceso" },
  { value: "read", label: "Ver" },
  { value: "write", label: "Editar" },
];

/** `access` vacío: se pidió volver a lo de su rol y su valor se sabrá al guardar. */
type EstadoDeSeccion = { access: string; heredado: boolean };

/**
 * Permisos de una persona (EQU-05 a EQU-07): agrupados como el menú, un control Sin acceso · Ver ·
 * Editar por sección y solo lo cambiado para esta persona marcado, con «Volver a lo de su rol».
 * Guarda solo los cambios: una sección que no se manda vuelve a lo que da su rol.
 * El master elige el negocio (o el alcance global); un dueño edita su negocio activo.
 */
export function GrillaDePermisos({
  collaborator,
  secciones,
  esMaster,
}: {
  collaborator: CollaboratorItem;
  secciones: string[];
  esMaster: boolean;
}) {
  const { run, pending } = useAction();
  const [estado, setEstado] = useState<Record<string, EstadoDeSeccion>>({});
  const [original, setOriginal] = useState<Record<string, EstadoDeSeccion>>({});
  const [cargando, setCargando] = useState(true);
  const [fallo, setFallo] = useState(false);
  const [negocio, setNegocio] = useState("");
  const [intento, setIntento] = useState(0);
  const grupos = useMemo(() => gruposDePermisos(secciones), [secciones]);
  const nombre = collaborator.nombre || collaborator.email;

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const query = negocio ? `?tenant=${encodeURIComponent(negocio)}` : "";
        const res = await fetch(`/api/collaborators/${collaborator.id}/permissions${query}`);
        const json = (await res.json().catch(() => null)) as { section: string; access: string; heredado: boolean }[] | null;
        if (!activo) return;
        if (!res.ok || !Array.isArray(json)) {
          setFallo(true);
          return;
        }
        const mapa: Record<string, EstadoDeSeccion> = {};
        for (const e of json) mapa[e.section] = { access: e.access || "none", heredado: e.heredado };
        setFallo(false);
        setEstado(mapa);
        setOriginal(mapa);
      } catch {
        if (activo) setFallo(true);
      } finally {
        if (activo) setCargando(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [collaborator.id, negocio, intento]);

  const recargar = useCallback(() => {
    setCargando(true);
    setIntento((n) => n + 1);
  }, []);

  /** Lo que da su rol, si se sabe: solo de las secciones que venían sin cambios. */
  const delRol = (section: string) => (original[section]?.heredado ? original[section].access : undefined);

  function fijar(section: string, access: string) {
    setEstado((prev) => ({ ...prev, [section]: { access, heredado: delRol(section) === access } }));
  }

  function volverAlRol(section: string) {
    setEstado((prev) => ({ ...prev, [section]: { access: delRol(section) ?? "", heredado: true } }));
  }

  function volverTodoAlRol() {
    setEstado((prev) =>
      Object.fromEntries(Object.entries(prev).map(([s, e]) => [s, e.heredado ? e : { access: delRol(s) ?? "", heredado: true }])),
    );
  }

  const aGuardar = permisosAGuardar(estado, secciones);
  const cambios = secciones.filter(
    (s) => estado[s] && (estado[s].access !== original[s]?.access || estado[s].heredado !== original[s]?.heredado),
  ).length;
  const hayPropios = Object.keys(aGuardar).length > 0;

  async function guardar() {
    const ok = await run(async () => {
      const res = await fetch(`/api/collaborators/${collaborator.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "permissions", tenant: negocio, permissions: aGuardar }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, status: res.status, error: json.error, success: "Permisos guardados." };
    });
    // Vuelve a leer: lo que pasó a «su rol» muestra ahora su valor.
    if (ok) recargar();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-body">
        Empieza con lo que da su rol. Lo que cambies aquí aplica solo a {nombre}
        {esMaster ? "." : " en este negocio."}
      </p>

      {esMaster && (
        <Field label="Negocio" htmlFor={`grilla-negocio-${collaborator.id}`} className="max-w-xs">
          <Select
            id={`grilla-negocio-${collaborator.id}`}
            value={negocio}
            onChange={(e) => {
              setNegocio(e.target.value);
              setCargando(true);
            }}
          >
            <option value="">Global (todos los negocios)</option>
            {collaborator.links.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {cargando ? (
        <div role="status" aria-label="Cargando los permisos" className="flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-1">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-8 w-52" />
            </div>
          ))}
        </div>
      ) : fallo ? (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-border-soft bg-surface-2 p-4 text-sm">
          <p className="text-headline">No pudimos cargar sus permisos.</p>
          <p className="text-body">Revisa tu conexión y vuelve a intentarlo.</p>
          <Button variant="outline" size="sm" onClick={recargar}>
            Reintentar
          </Button>
        </div>
      ) : (
        grupos.map((grupo) => (
          <section key={grupo.id} aria-labelledby={`permisos-${grupo.id}`} className="flex flex-col">
            <h3 id={`permisos-${grupo.id}`} className="mb-1 text-xs font-medium tracking-[0.06em] text-text-soft uppercase">
              {grupo.label}
            </h3>
            <ul className="flex flex-col">
              {grupo.filas.map(({ section, label }) => {
                const actual = estado[section] ?? { access: "none", heredado: true };
                const pendienteDelRol = actual.heredado && !actual.access;
                return (
                  <li
                    key={section}
                    className="flex flex-col gap-2 border-t border-border-soft py-2.5 first:border-t-0 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="text-sm text-headline">{label}</span>
                      {!actual.heredado && (
                        <span className="text-xs text-text-soft">
                          Cambiado para esta persona ·{" "}
                          <button
                            type="button"
                            onClick={() => volverAlRol(section)}
                            className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-focus"
                            aria-label={`Volver a lo de su rol en ${label}`}
                          >
                            Volver a lo de su rol
                          </button>
                        </span>
                      )}
                      {pendienteDelRol && <span className="text-xs text-text-soft">Vuelve a lo de su rol al guardar</span>}
                    </div>
                    <SegmentedControl
                      label={`Acceso a ${label}`}
                      options={NIVELES}
                      value={actual.access}
                      onChange={(v) => fijar(section, v)}
                      className="w-full sm:w-auto"
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      {!cargando && !fallo && (
        <div className="sticky -bottom-5 -mx-5 -mb-5 mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border-soft bg-surface px-5 py-4">
          {hayPropios ? (
            <Button variant="ghost" size="sm" onClick={volverTodoAlRol} disabled={pending}>
              Volver todo a lo de su rol
            </Button>
          ) : (
            <span className="text-xs text-text-soft">Todo según su rol.</span>
          )}
          <div className="flex items-center gap-3">
            {cambios > 0 && (
              <span className="text-xs text-text-soft" aria-live="polite">
                {cambios === 1 ? "1 cambio sin guardar" : `${cambios} cambios sin guardar`}
              </span>
            )}
            <Button variant="accent" size="sm" onClick={() => void guardar()} disabled={pending || cambios === 0} loading={pending}>
              Guardar permisos
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
