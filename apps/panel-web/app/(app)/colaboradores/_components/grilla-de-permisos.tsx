"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { CollaboratorItem } from "@/lib/api/types";
import { seccionLabel } from "@/lib/labels";
import { useAction } from "@/lib/use-action";

type Acceso = "none" | "read" | "write";

const COLUMNAS: { valor: Acceso; label: string }[] = [
  { valor: "none", label: "Sin acceso" },
  { valor: "read", label: "Ver" },
  { valor: "write", label: "Editar" },
];

type EstadoDeSeccion = { access: Acceso; heredado: boolean };

/**
 * Grilla de permisos (HU-UI-10): una fila por sección, tres estados (sin acceso/ver/editar)
 * y el heredado del rol señalado. Guarda el mapa completo de una vez con `set_permissions`.
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
  const [cargando, setCargando] = useState(true);
  const [negocio, setNegocio] = useState("");

  useEffect(() => {
    let activo = true;
    (async () => {
      const query = negocio ? `?tenant=${encodeURIComponent(negocio)}` : "";
      const res = await fetch(`/api/collaborators/${collaborator.id}/permissions${query}`);
      const json = (await res.json().catch(() => [])) as {
        section: string;
        access: string;
        heredado: boolean;
      }[];
      if (!activo) return;
      const mapa: Record<string, EstadoDeSeccion> = {};
      for (const e of json) mapa[e.section] = { access: (e.access as Acceso) ?? "none", heredado: e.heredado };
      setEstado(mapa);
      setCargando(false);
    })();
    return () => {
      activo = false;
    };
  }, [collaborator.id, negocio]);

  function cambiarNegocio(valor: string) {
    setNegocio(valor);
    setCargando(true);
  }

  function fijar(section: string, access: Acceso) {
    setEstado((prev) => ({ ...prev, [section]: { access, heredado: false } }));
  }

  async function guardar() {
    const permisos = Object.fromEntries(secciones.map((s) => [s, estado[s]?.access ?? "none"]));
    await run(async () => {
      const res = await fetch(`/api/collaborators/${collaborator.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "permissions", tenant: negocio, permissions: permisos }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: res.ok, status: res.status, error: json.error, success: "Permisos guardados." };
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {esMaster && (
        <Field label="Negocio" htmlFor={`grilla-negocio-${collaborator.id}`} className="max-w-xs">
          <Select
            id={`grilla-negocio-${collaborator.id}`}
            value={negocio}
            onChange={(e) => cambiarNegocio(e.target.value)}
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
        <p className="text-sm text-text-soft">Cargando permisos…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-soft text-left text-xs text-text-soft">
                <th className="py-2 pr-3 font-medium">Sección</th>
                {COLUMNAS.map((c) => (
                  <th key={c.valor} className="px-2 py-2 text-center font-medium">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {secciones.map((section) => {
                const actual = estado[section]?.access ?? "none";
                const heredado = estado[section]?.heredado ?? true;
                return (
                  <tr key={section} className="border-b border-border-soft">
                    <td className="py-2 pr-3">
                      <span className="text-headline">{seccionLabel(section)}</span>
                      {heredado && (
                        <span className="ml-2 rounded bg-bg-deep px-1.5 py-0.5 text-[11px] text-text-soft">
                          heredado
                        </span>
                      )}
                    </td>
                    {COLUMNAS.map((c) => (
                      <td key={c.valor} className="px-2 py-2 text-center">
                        <input
                          type="radio"
                          name={`grilla-${section}`}
                          aria-label={`${seccionLabel(section)}: ${c.label}`}
                          checked={actual === c.valor}
                          onChange={() => fijar(section, c.valor)}
                          className="h-4 w-4 accent-[var(--sh-blue-500)]"
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="accent" size="sm" onClick={() => void guardar()} disabled={pending || cargando}>
          {pending ? "Guardando…" : "Guardar permisos"}
        </Button>
      </div>
    </div>
  );
}
