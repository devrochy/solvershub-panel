import Link from "next/link";
import { Eye } from "lucide-react";

import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { FiltrosSuscripciones } from "@/app/(app)/suscripciones/_components/filtros";
import { StatusBadge, SUBSCRIPTION_STATUS } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { IconAction } from "@/components/ui/icon-action";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { SubscriptionProviderSettings, SuscripcionItem, SuscripcionesPage } from "@/lib/api/types";
import { formatDate, formatMoney } from "@/lib/format";
import {
  MOTIVO_PAUSA_LABEL,
  conQuery,
  consultaSuscripciones,
  enlaceDePagina,
  nombreDelCliente,
  periodicidadLabel,
  planesDeProductos,
  textoDeMora,
  type FiltrosSuscripciones as Filtros,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Suscripciones" };

export default async function SuscripcionesListaPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  const qs = consultaSuscripciones(sp);
  const [res, productos, proveedor] = await Promise.all([
    apiFetch<SuscripcionesPage>(`/pack/pack_subscriptions/suscripciones${conQuery(qs)}`),
    apiFetch<Parameters<typeof planesDeProductos>[0]>("/pack/commerce/products"),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
  ]);
  const { items, page, has_more, total } = res.ok
    ? res.data
    : { items: [] as SuscripcionItem[], page: 1, has_more: false, total: 0 };

  const columns: Column<SuscripcionItem>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (s) => (
        <div className="flex min-w-0 flex-col">
          <Link href={`/suscripciones/lista/${s.id}`} className="truncate font-medium text-link hover:underline">
            {nombreDelCliente(s.cliente)}
          </Link>
          {s.cliente.telefono && s.cliente.nombre && (
            <span className="truncate text-xs text-text-soft">{s.cliente.telefono}</span>
          )}
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      cell: (s) => (
        <div className="flex flex-col">
          <span className="text-headline">{s.plan}</span>
          <span className="text-xs text-text-soft">{periodicidadLabel(s.periodicidad)}</span>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (s) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge value={s.estado} map={SUBSCRIPTION_STATUS} />
          {s.estado === "pausada" && s.motivo_pausa && (
            <span className="text-xs text-text-soft">{MOTIVO_PAUSA_LABEL[s.motivo_pausa] ?? s.motivo_pausa}</span>
          )}
        </div>
      ),
    },
    {
      key: "valor",
      header: "Valor",
      align: "right",
      cell: (s) => <span className="tabular-nums">{formatMoney(s.valor_periodo, s.moneda)}</span>,
    },
    {
      key: "proximo",
      header: "Próximo cobro",
      info: "Cuándo se genera el siguiente cobro. Vacío si está pausada, cancelada o en prueba sin cobro.",
      cell: (s) => <span className="tabular-nums">{s.proximo_cargo ? formatDate(s.proximo_cargo) : "—"}</span>,
    },
    {
      key: "debe",
      header: "Debe",
      align: "right",
      info: "Suma de los cobros del período que están pendientes. Si ya vencieron, se indica la mora.",
      cell: (s) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums text-headline">{s.deuda ? formatMoney(s.deuda, s.moneda) : "—"}</span>
          {s.en_mora > 0 && <span className="text-xs text-status-danger-fg">{textoDeMora(s.dias_mora)}</span>}
        </div>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (s) => (
        <div className="flex items-center justify-end gap-1">
          <IconAction href={`/suscripciones/lista/${s.id}`} label={`Ver suscripción de ${nombreDelCliente(s.cliente)}`} tone="ver">
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
        </div>
      ),
    },
  ];

  return (
    <ListPage
      header={{
        title: "Suscripciones",
        description: "Los clientes que pagan un plan cada periodo: su estado, el próximo cobro y lo que deben.",
        helpSection: "subscriptions",
      }}
      filters={
        <FiltrosSuscripciones sp={sp} planes={productos.ok ? planesDeProductos(productos.data) : []} />
      }
    >
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(s) => s.id}
        emptyTitle="Sin suscripciones"
        emptyDescription="Cuando un cliente compre un plan, su suscripción aparecerá aquí."
        error={res.ok ? null : `No se pudieron cargar las suscripciones: ${res.error}`}
        caption="Suscripciones"
        serverPaginated
      />
      {res.ok && (
        <Pagination
          page={page}
          hasMore={has_more}
          total={total}
          label="suscripciones"
          makeHref={(target) => enlaceDePagina("/suscripciones/lista", qs, target)}
        />
      )}
    </ListPage>
  );
}
