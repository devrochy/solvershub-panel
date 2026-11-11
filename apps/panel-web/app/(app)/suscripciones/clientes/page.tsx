import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { FiltrosClientes } from "@/app/(app)/suscripciones/_components/filtros";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { MenuDeFila } from "@/components/domain/menu-de-fila";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { ListPage } from "@/components/templates/list-page";
import type { Column } from "@/components/ui/data-table";
import { DropdownMenuLinkItem } from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ClienteConSuscripcion, ClientesConSuscripcionPage, SubscriptionProviderSettings } from "@/lib/api/types";
import { formatCop } from "@/lib/format";
import {
  conQuery,
  consultaClientesSuscripcion,
  enlaceDePagina,
  mesLegible,
  nombreDelCliente,
  textoDeMora,
  type FiltrosClientesSuscripcion,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Clientes con suscripción" };

const cabecera = { title: "Clientes con suscripción", helpSection: "subscriptions" };

/** «1 vigente», «2 vigentes de 3»: las canceladas cuentan solo en el total. */
function vigentes(c: ClienteConSuscripcion): string {
  const base = c.vivas === 1 ? "1 vigente" : `${c.vivas} vigentes`;
  return c.suscripciones > c.vivas ? `${base} de ${c.suscripciones}` : base;
}

function ultimoPago(c: ClienteConSuscripcion): string {
  return c.ultimo_periodo_pagado ? `Pagó ${mesLegible(c.ultimo_periodo_pagado)}` : "Aún no paga";
}

/**
 * Clientes con suscripción (SUS-11): en palabras («1 vigente», «Pagó octubre de 2026»), la fila
 * abre sus suscripciones y la ficha del cliente va en «Más acciones».
 */
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
  if (!res.ok) {
    return (
      <ListPage header={cabecera} filters={<FiltrosClientes />}>
        <ErrorDeCarga titulo="No pudimos cargar los clientes" detalle={res.error} />
      </ListPage>
    );
  }
  const { items, page, has_more, total } = res.data;
  const suscripcionesDe = (c: ClienteConSuscripcion) => `/suscripciones/lista?cliente_id=${c.cliente.id}`;
  const menu = (c: ClienteConSuscripcion) => (
    <MenuDeFila etiqueta={`Más acciones de ${nombreDelCliente(c.cliente)}`}>
      <DropdownMenuLinkItem href={suscripcionesDe(c)}>Ver sus suscripciones</DropdownMenuLinkItem>
      <DropdownMenuLinkItem href={`/leads?cliente=${c.cliente.id}&agente=suscripciones`}>Abrir la ficha del cliente</DropdownMenuLinkItem>
    </MenuDeFila>
  );

  const columns: Column<ClienteConSuscripcion>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-headline">{nombreDelCliente(c.cliente)}</span>
          {c.cliente.telefono && c.cliente.nombre && (
            <span className="truncate text-xs text-text-soft">{c.cliente.telefono}</span>
          )}
        </div>
      ),
    },
    {
      key: "planes",
      header: "Planes",
      cell: (c) => (
        <div className="flex flex-col">
          <span className="text-body">{c.planes.length ? c.planes.join(", ") : "—"}</span>
          <span className="text-xs text-text-soft">{vigentes(c)}</span>
        </div>
      ),
    },
    {
      key: "debe",
      header: "Debe",
      align: "right",
      cell: (c) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums text-headline">{c.deuda ? formatCop(c.deuda) : "Al día"}</span>
          {c.en_mora > 0 && <span className="whitespace-nowrap text-xs text-status-danger-fg">{textoDeMora(c.dias_mora)}</span>}
        </div>
      ),
    },
    { key: "pagado", header: "Último pago", cell: (c) => <span className="text-body">{ultimoPago(c)}</span> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (c) => <div className="relative z-10 flex justify-end">{menu(c)}</div>,
    },
  ];

  return (
    <ListPage header={cabecera} filters={<FiltrosClientes />}>
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      <TablaResponsiva
        etiqueta="Clientes con suscripción"
        columns={columns}
        rows={items}
        getRowKey={(c) => c.cliente.id}
        getRowHref={suscripcionesDe}
        getRowLabel={(c) => `Ver las suscripciones de ${nombreDelCliente(c.cliente)}`}
        filaCelular={(c) => ({
          titulo: nombreDelCliente(c.cliente),
          detalle: (
            <span className={c.en_mora > 0 ? "text-status-danger-fg" : undefined}>
              {c.planes.join(", ") || "Sin plan"} · {c.en_mora > 0 ? textoDeMora(c.dias_mora) : ultimoPago(c)}
            </span>
          ),
          fin: c.deuda ? formatCop(c.deuda) : undefined,
          accion: menu(c),
          href: suscripcionesDe(c),
        })}
        emptyTitle="Sin clientes con suscripción"
        emptyDescription="Cuando un cliente compre un plan, aparecerá aquí con lo que debe."
        caption="Clientes con suscripción"
        serverPaginated
      />
      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="clientes" singular="cliente"
        makeHref={(target) => enlaceDePagina("/suscripciones/clientes", qs, target)}
      />
    </ListPage>
  );
}
