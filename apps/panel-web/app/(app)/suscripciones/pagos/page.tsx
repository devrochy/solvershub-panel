import Link from "next/link";
import { Eye } from "lucide-react";

import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { FiltrosPagos } from "@/app/(app)/suscripciones/_components/filtros";
import { ReenviarLink } from "@/app/(app)/suscripciones/_components/reenviar-link";
import { CHARGE_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { IconAction } from "@/components/ui/icon-action";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { CargoSuscripcion, CargosSuscripcionPage, Me, SubscriptionProviderSettings } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/format";
import {
  canalDePagoExterno,
  conQuery,
  consultaPagos,
  enlaceDePagina,
  nombreDelCliente,
  puedeAdministrar,
  textoDeMora,
  tipoDePagoLabel,
  type FiltrosPagos as Filtros,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Pagos de suscripciones" };

export default async function PagosDeSuscripcionesPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  const qs = consultaPagos(sp);
  const [res, me, proveedor] = await Promise.all([
    apiFetch<CargosSuscripcionPage>(`/pack/pack_subscriptions/cargos${conQuery(qs)}`),
    apiFetch<Me>("/admin/me"),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
  ]);
  const puedeEscribir = me.ok && puedeAdministrar(me.data);
  const { items, page, has_more, total } = res.ok
    ? res.data
    : { items: [] as CargoSuscripcion[], page: 1, has_more: false, total: 0 };

  const columns: Column<CargoSuscripcion>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (c) => (
        <div className="flex min-w-0 flex-col">
          <Link href={`/suscripciones/lista/${c.suscripcion_id}`} className="truncate font-medium text-link hover:underline">
            {c.cliente ? nombreDelCliente(c.cliente) : "—"}
          </Link>
          <span className="truncate text-xs text-text-soft">{c.plan}</span>
        </div>
      ),
    },
    {
      key: "periodo",
      header: "Período",
      cell: (c) => (
        <div className="flex flex-col items-start gap-1">
          <span className="tabular-nums text-headline">{c.periodo}</span>
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
    { key: "estado", header: "Estado", cell: (c) => <StatusBadge value={c.estado} map={CHARGE_STATUS} /> },
    {
      key: "vence",
      header: "Vence",
      cell: (c) => (
        <div className="flex flex-col">
          <span className="tabular-nums">{c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : "—"}</span>
          {c.dias_mora != null && <span className="text-xs text-status-danger-fg">{textoDeMora(c.dias_mora)}</span>}
        </div>
      ),
    },
    {
      key: "pago",
      header: "Pago externo",
      info: "Si el cobro lo pagó otro canal (no el link de pago), aquí se indica cuál.",
      cell: (c) => {
        const canal = canalDePagoExterno(c.pago_externo);
        return canal ? <span className="text-body">{canal}</span> : <span className="text-text-soft">—</span>;
      },
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => {
        const cliente = c.cliente ? nombreDelCliente(c.cliente) : "el cliente";
        return (
          <div className="flex items-center justify-end gap-1">
            {puedeEscribir && c.estado === "pendiente" && c.tipo === "periodo" && (
              <ReenviarLink cargo={{ id: c.id, periodo: c.periodo, monto: c.monto, moneda: c.moneda }} cliente={cliente} />
            )}
            <IconAction href={`/suscripciones/lista/${c.suscripcion_id}`} label={`Ver la suscripción de ${cliente}`} tone="ver">
              <Eye className="h-4 w-4" aria-hidden />
            </IconAction>
          </div>
        );
      },
    },
  ];

  return (
    <ListPage
      header={{
        title: "Pagos de suscripciones",
        description: "Los cobros de cada periodo: cuáles están pagados, cuáles pendientes y cuáles vencieron.",
        helpSection: "subscriptions",
      }}
      filters={<FiltrosPagos sp={sp} />}
    >
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(c) => c.id}
        emptyTitle="Sin pagos"
        emptyDescription="Los cobros se generan unos días antes de cada fecha de cobro."
        error={res.ok ? null : `No se pudieron cargar los pagos: ${res.error}`}
        caption="Pagos de suscripciones"
        serverPaginated
      />
      {res.ok && (
        <Pagination
          page={page}
          hasMore={has_more}
          total={total}
          label="cobros"
          makeHref={(target) => enlaceDePagina("/suscripciones/pagos", qs, target)}
        />
      )}
    </ListPage>
  );
}
