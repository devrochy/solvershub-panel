import Link from "next/link";
import { Eye, Repeat } from "lucide-react";

import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { FiltrosClientes } from "@/app/(app)/suscripciones/_components/filtros";
import { ListPage } from "@/components/templates/list-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { IconAction } from "@/components/ui/icon-action";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ClienteConSuscripcion, ClientesConSuscripcionPage, SubscriptionProviderSettings } from "@/lib/api/types";
import { formatCop } from "@/lib/format";
import {
  conQuery,
  consultaClientesSuscripcion,
  enlaceDePagina,
  nombreDelCliente,
  textoDeMora,
  type FiltrosClientesSuscripcion,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Clientes con suscripción" };

export default async function ClientesConSuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosClientesSuscripcion>;
}) {
  const sp = await searchParams;
  const qs = consultaClientesSuscripcion(sp);
  const [res, proveedor] = await Promise.all([
    apiFetch<ClientesConSuscripcionPage>(`/pack/pack_subscriptions/clientes${conQuery(qs)}`),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
  ]);
  const { items, page, has_more, total } = res.ok
    ? res.data
    : { items: [] as ClienteConSuscripcion[], page: 1, has_more: false, total: 0 };

  const columns: Column<ClienteConSuscripcion>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/leads?cliente=${c.cliente.id}&agente=suscripciones`}
            className="truncate font-medium text-link hover:underline"
          >
            {nombreDelCliente(c.cliente)}
          </Link>
          {c.cliente.telefono && c.cliente.nombre && (
            <span className="truncate text-xs text-text-soft">{c.cliente.telefono}</span>
          )}
        </div>
      ),
    },
    {
      key: "planes",
      header: "Planes",
      cell: (c) => <span className="text-body">{c.planes.length ? c.planes.join(", ") : "—"}</span>,
    },
    {
      key: "vigentes",
      header: "Suscripciones",
      info: "Vigentes (en prueba, activas, pausadas o vencidas) frente al total, canceladas incluidas.",
      align: "right",
      cell: (c) => (
        <span className="tabular-nums">
          {c.vivas}
          <span className="text-text-soft"> de {c.suscripciones}</span>
        </span>
      ),
    },
    {
      key: "debe",
      header: "Debe",
      align: "right",
      cell: (c) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums text-headline">{c.deuda ? formatCop(c.deuda) : "—"}</span>
          {c.en_mora > 0 && <span className="text-xs text-status-danger-fg">{textoDeMora(c.dias_mora)}</span>}
        </div>
      ),
    },
    {
      key: "pagado",
      header: "Último período pagado",
      info: "El período del último cobro que pagó. Los cobros no guardan la fecha exacta del pago.",
      cell: (c) => <span className="tabular-nums">{c.ultimo_periodo_pagado ?? "—"}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <IconAction
            href={`/suscripciones/lista?cliente_id=${c.cliente.id}`}
            label={`Ver las suscripciones de ${nombreDelCliente(c.cliente)}`}
            tone="editar"
          >
            <Repeat className="h-4 w-4" aria-hidden />
          </IconAction>
          <IconAction
            href={`/leads?cliente=${c.cliente.id}&agente=suscripciones`}
            label={`Ver la ficha de ${nombreDelCliente(c.cliente)}`}
            tone="ver"
          >
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
        </div>
      ),
    },
  ];

  return (
    <ListPage
      header={{
        title: "Clientes con suscripción",
        description: "A quién le cobras: sus planes, lo que deben y el último período que pagaron.",
        helpSection: "subscriptions",
      }}
      filters={<FiltrosClientes sp={sp} />}
    >
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(c) => c.cliente.id}
        emptyTitle="Sin clientes con suscripción"
        emptyDescription="Cuando un cliente compre un plan, aparecerá aquí con lo que debe."
        error={res.ok ? null : `No se pudieron cargar los clientes: ${res.error}`}
        caption="Clientes con suscripción"
        serverPaginated
      />
      {res.ok && (
        <Pagination
          page={page}
          hasMore={has_more}
          total={total}
          label="clientes"
          makeHref={(target) => enlaceDePagina("/suscripciones/clientes", qs, target)}
        />
      )}
    </ListPage>
  );
}
