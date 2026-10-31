import Link from "next/link";
import { Eye } from "lucide-react";

import { ListPage } from "@/components/templates/list-page";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { IconAction } from "@/components/ui/icon-action";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { LeadsResponse } from "@/lib/api/types";
import { hrefFicha, telefonoVisible } from "@/lib/clientes";
import { formatCellValue } from "@/lib/format";

type Fila = LeadsResponse["items"][number];

export type FiltrosClientesDeModulo = { q?: string; page?: string };

/** Query de `/admin/leads` para la lista de un módulo: el agente, la búsqueda y la página. */
export function consultaClientesDeModulo(agente: string, sp: FiltrosClientesDeModulo): URLSearchParams {
  const qs = new URLSearchParams({ agente });
  if (sp.q?.trim()) qs.set("q", sp.q.trim());
  if (sp.page) qs.set("page", sp.page);
  return qs;
}

/**
 * Lista de clientes de un módulo (HU-CRM-12, ADR-0179): los clientes con datos reales de un
 * agente (Ventas, Agenda…), con las columnas que ese agente declara. Usa `/admin/leads?agente=`
 * del mismo endpoint que Operación › Clientes; cada fila abre la ficha en la pestaña del agente.
 */
export async function ClientesDeModulo({
  agente,
  basePath,
  titulo,
  descripcion,
  sp,
  helpSection,
  vacioDescripcion,
}: {
  /** Clave del agente en `agents[].key` (`ventas`, `agenda`…). */
  agente: string;
  /** Ruta de esta página, para la paginación y la búsqueda. */
  basePath: string;
  titulo: string;
  descripcion: string;
  sp: FiltrosClientesDeModulo;
  helpSection?: string;
  vacioDescripcion: string;
}) {
  const qs = consultaClientesDeModulo(agente, sp);
  const res = await apiFetch<LeadsResponse>(`/admin/leads?${qs.toString()}`);
  const { items, agents, page, has_more, total } = res.ok
    ? res.data
    : { items: [] as Fila[], agents: [], page: 1, has_more: false, total: 0 };
  const columnasDelAgente = agents.find((a) => a.key === agente)?.columns ?? [];

  const columns: Column<Fila>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (lead) => (
        <Link href={hrefFicha(lead.id, { agente })} className="truncate font-medium text-link hover:underline">
          {lead.perfil.nombre_visible}
        </Link>
      ),
    },
    {
      key: "telefono",
      header: "Teléfono",
      cell: (lead) => <span className="text-body">{telefonoVisible(lead.perfil)}</span>,
    },
    ...columnasDelAgente.map(
      (columna): Column<Fila> => ({
        key: `extra-${columna.key}`,
        header: columna.label,
        cell: (lead) => <span className="text-body">{formatCellValue(lead.extras[columna.key])}</span>,
      }),
    ),
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (lead) => (
        <div className="flex items-center justify-end gap-1">
          <IconAction href={hrefFicha(lead.id, { agente })} label={`Ver la ficha de ${lead.perfil.nombre_visible}`} tone="ver">
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
        </div>
      ),
    },
  ];

  return (
    <ListPage
      header={{ title: titulo, description: descripcion, helpSection }}
      filters={
        <form method="get" action={basePath} className="flex flex-wrap items-end gap-3">
          <Field label="Buscar" htmlFor="q" className="w-60">
            <Input id="q" name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Nombre, identificador o teléfono" />
          </Field>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
          {sp.q && (
            <Link href={basePath} className="pb-2.5 text-sm text-link hover:underline">
              Limpiar
            </Link>
          )}
        </form>
      }
    >
      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(lead) => lead.id}
        emptyTitle="Sin clientes todavía"
        emptyDescription={vacioDescripcion}
        error={res.ok ? null : `No se pudieron cargar los clientes: ${res.error}`}
        caption={titulo}
        serverPaginated
      />
      {res.ok && (
        <Pagination
          page={page}
          hasMore={has_more}
          total={total}
          label="clientes"
          makeHref={(target) => {
            const next = new URLSearchParams(qs);
            next.delete("agente");
            next.set("page", String(target));
            return `${basePath}?${next.toString()}`;
          }}
        />
      )}
    </ListPage>
  );
}
