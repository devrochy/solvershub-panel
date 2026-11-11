import { AccionesDeCobro } from "@/app/(app)/suscripciones/_components/acciones-de-cobro";
import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { DetalleDelCobro } from "@/app/(app)/suscripciones/_components/detalle-del-cobro";
import { FiltrosPagos } from "@/app/(app)/suscripciones/_components/filtros";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { CHARGE_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { ListPage } from "@/components/templates/list-page";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { CargoSuscripcion, CargosSuscripcionPage, Me, SubscriptionProviderSettings } from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/format";
import {
  conQuery,
  consultaPagos,
  enlaceDePagina,
  mesLegible,
  nombreDelCliente,
  puedeAdministrar,
  tipoDePagoLabel,
  vistaDePagos,
  type FiltrosPagos as Filtros,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Pagos de suscripciones" };

const cabecera = { title: "Pagos de suscripciones", helpSection: "subscriptions" };

/**
 * Pagos (SUS-12): empieza por lo que hay que cobrar; Vencidos, Pagados y Todos en un control
 * segmentado. Cada cobro dice cuándo vence o cómo se pagó, y sus acciones van en un menú.
 */
export default async function PagosDeSuscripcionesPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  const qs = consultaPagos(sp);
  const [res, me, proveedor] = await Promise.all([
    apiFetch<CargosSuscripcionPage>(`/pack/pack_subscriptions/cargos${conQuery(qs)}`),
    apiFetch<Me>("/admin/me"),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
  ]);
  if (!res.ok) {
    return (
      <ListPage header={cabecera} filters={<FiltrosPagos />}>
        <ErrorDeCarga titulo="No pudimos cargar los pagos" detalle={res.error} />
      </ListPage>
    );
  }
  const puedeEscribir = me.ok && puedeAdministrar(me.data);
  const { items, page, has_more, total } = res.data;
  const vista = vistaDePagos(sp);
  const clienteDe = (c: CargoSuscripcion) => (c.cliente ? nombreDelCliente(c.cliente) : "el cliente");
  const acciones = (c: CargoSuscripcion) => (
    <AccionesDeCobro
      cargo={{ id: c.id, periodo: c.periodo, monto: c.monto, moneda: c.moneda, estado: c.estado, tipo: c.tipo }}
      cliente={clienteDe(c)}
      puedeEscribir={puedeEscribir}
      suscripcionHref={`/suscripciones/lista/${c.suscripcion_id}`}
    />
  );
  const cobro = (c: CargoSuscripcion) => (c.tipo === "periodo" ? mesLegible(c.periodo) : `${mesLegible(c.periodo)} · ${tipoDePagoLabel(c.tipo).toLowerCase()}`);

  const columns: Column<CargoSuscripcion>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-headline">{clienteDe(c)}</span>
          <span className="truncate text-xs text-text-soft">{c.plan}</span>
        </div>
      ),
    },
    {
      key: "cobro",
      header: "Cobro",
      cell: (c) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-headline">{mesLegible(c.periodo)}</span>
          {c.tipo !== "periodo" && <Badge variant="accent">{tipoDePagoLabel(c.tipo)}</Badge>}
        </div>
      ),
    },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      cell: (c) => <span className="tabular-nums">{formatMoney(c.monto, c.moneda ?? "COP")}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (c) => (
        <span className="whitespace-nowrap">
          <StatusBadge value={c.estado} map={CHARGE_STATUS} />
        </span>
      ),
    },
    { key: "cuando", header: "Cuándo", cell: (c) => <DetalleDelCobro cargo={c} /> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (c) => <div className="relative z-10 flex justify-end">{acciones(c)}</div>,
    },
  ];

  const vencidos = items.filter((c) => (c.dias_mora ?? 0) > 0).length;
  const suma = items.reduce((t, c) => t + c.monto, 0);
  const resumen =
    vista === "por_cobrar" && total > 0
      ? [
          `${total === 1 ? "1 cobro pendiente" : `${formatNumber(total)} cobros pendientes`}`,
          !has_more && formatMoney(suma, items[0]?.moneda ?? "COP"),
          vencidos > 0 && (vencidos === 1 ? "1 ya venció" : `${vencidos} ya vencieron`),
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <ListPage header={cabecera} filters={<FiltrosPagos />}>
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      {resumen && <p className="text-sm text-body">{resumen}</p>}
      <TablaResponsiva
        etiqueta="Pagos de suscripciones"
        columns={columns}
        rows={items}
        getRowKey={(c) => c.id}
        getRowHref={(c) => `/suscripciones/lista/${c.suscripcion_id}`}
        getRowLabel={(c) => `Abrir la suscripción de ${clienteDe(c)}`}
        filaCelular={(c) => ({
          titulo: clienteDe(c),
          detalle: (
            <>
              {cobro(c)} · <DetalleDelCobro cargo={c} />
            </>
          ),
          fin: formatMoney(c.monto, c.moneda ?? "COP"),
          accion: acciones(c),
          href: `/suscripciones/lista/${c.suscripcion_id}`,
        })}
        emptyTitle={vista === "por_cobrar" ? "Nadie te debe" : vista === "vencidos" ? "Ningún cobro vencido" : "Sin pagos"}
        emptyDescription={
          vista === "por_cobrar" || vista === "vencidos"
            ? "Todos los cobros están pagados."
            : "Los cobros se generan unos días antes de cada fecha de cobro."
        }
        caption="Pagos de suscripciones"
        serverPaginated
      />
      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="cobros"
        makeHref={(target) => enlaceDePagina("/suscripciones/pagos", qs, target)}
      />
    </ListPage>
  );
}
