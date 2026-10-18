"use client";

import { useState } from "react";

import { CollaboratorActions } from "@/app/(app)/colaboradores/_components/collaborator-actions";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { CollaboratorItem } from "@/lib/api/types";
import {
  filtrarPorNegocio,
  negociosDeFilas,
  nombresPorSlug,
  permisoLegible,
  puedeActuarSobre,
  vinculoLegible,
} from "@/lib/colaboradores";
import { rolLabel } from "@/lib/labels";

/**
 * Tabla de cuentas con acceso al panel. Filtro por negocio cuando las filas pertenecen a más
 * de uno (el master ve todas las cuentas de la plataforma), permisos en texto claro y
 * acciones solo sobre las cuentas que la sesión puede gestionar.
 */
export function TablaDeColaboradores({
  filas,
  secciones,
  esMaster,
}: {
  filas: CollaboratorItem[];
  /** Secciones que se pueden otorgar o revocar desde esta sesión. */
  secciones: string[];
  esMaster: boolean;
}) {
  const [negocio, setNegocio] = useState("");
  const negocios = negociosDeFilas(filas);
  const nombres = esMaster ? nombresPorSlug(filas) : undefined;
  const visibles = filtrarPorNegocio(filas, negocio);

  const columns: Column<CollaboratorItem>[] = [
    {
      key: "cuenta",
      header: "Cuenta",
      cell: (c) => (
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-headline">
            {c.email}
            {c.is_self && <Badge variant="neutral">tú</Badge>}
          </span>
          {c.username && <span className="font-mono text-xs text-text-soft">{c.username}</span>}
        </div>
      ),
    },
    {
      key: "rol",
      header: "Rol",
      cell: (c) => (
        <Badge variant={c.is_platform_master ? "accent" : "neutral"}>
          {c.is_platform_master ? rolLabel("master") : rolLabel(c.role)}
        </Badge>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (c) => (
        <Badge variant={c.active ? "success" : "danger"}>{c.active ? "Activa" : "Inactiva"}</Badge>
      ),
    },
    {
      key: "negocios",
      header: "Negocios",
      cell: (c) =>
        c.links.length === 0 ? (
          <span className="text-text-soft">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {c.links.map((link) => (
              <Badge key={`${link.slug}-${link.role}`} variant="neutral">
                {vinculoLegible(link)}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "permisos",
      header: "Permisos",
      info: "Permisos por sección que tiene el colaborador en este negocio, además de los de su rol.",
      cell: (c) =>
        c.permissions.length === 0 ? (
          <span className="text-text-soft">Los de su rol</span>
        ) : (
          <ul className="flex flex-wrap gap-1">
            {c.permissions.map((permission) => (
              <li key={`${permission.section}-${permission.scope}`}>
                <Badge variant="neutral">{permisoLegible(permission, nombres)}</Badge>
              </li>
            ))}
          </ul>
        ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) =>
        puedeActuarSobre(c, esMaster) ? (
          <CollaboratorActions collaborator={c} sections={secciones} esMaster={esMaster} />
        ) : (
          <span className="text-xs text-text-soft">Sin acciones</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {negocios.length > 1 && (
        <Field label="Negocio" htmlFor="filtro-negocio" className="w-full max-w-xs">
          <Select id="filtro-negocio" value={negocio} onChange={(e) => setNegocio(e.target.value)}>
            <option value="">Todos los negocios</option>
            {negocios.map((n) => (
              <option key={n.slug} value={n.slug}>
                {n.name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <DataTable
        columns={columns}
        rows={visibles}
        getRowKey={(c) => c.id}
        emptyTitle={negocio ? "Sin colaboradores en este negocio" : "Sin colaboradores"}
        emptyDescription={
          negocio
            ? "Elige otro negocio o quita el filtro para ver todas las cuentas."
            : "Invita a tu equipo para que gestionen el panel contigo."
        }
      />
    </div>
  );
}
