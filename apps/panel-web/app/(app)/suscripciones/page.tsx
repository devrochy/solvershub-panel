import Link from "next/link";

import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { DatosDePruebaDelModulo } from "@/components/domain/datos-de-prueba-modulo";
import { StatusBadge, SUBSCRIPTION_STATUS } from "@/components/domain/status-badge";
import { DashboardPage } from "@/components/templates/dashboard-page";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { apiFetch } from "@/lib/api/server";
import type {
  CohorteSuscripciones,
  EstadoDatosDePruebaModulo,
  MetricasSuscripciones,
  SubscriptionProviderSettings,
  SuscripcionItem,
  SuscripcionesPage,
} from "@/lib/api/types";
import { formatMoney, formatNumber } from "@/lib/format";
import {
  mesLegible,
  nombreDelCliente,
  porcentaje,
  retencion,
  textoDeMora,
  variacion,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Resumen de suscripciones" };

const ANTERIOR = "el mes anterior";

function delta(actual: number, anterior: number, versus = ANTERIOR) {
  const v = variacion(actual, anterior);
  return v == null ? undefined : { value: v, versus };
}

export default async function ResumenSuscripcionesPage() {
  const [metricas, conMora, proveedor, datosPrueba] = await Promise.all([
    apiFetch<MetricasSuscripciones>("/pack/pack_subscriptions/metricas"),
    apiFetch<SuscripcionesPage>("/pack/pack_subscriptions/suscripciones?con_mora=true&page_size=5"),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
    apiFetch<EstadoDatosDePruebaModulo>("/admin/datos-de-prueba/suscripciones"),
  ]);
  const aviso = (
    <>
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      {datosPrueba.ok && (
        <DatosDePruebaDelModulo modulo="suscripciones" estado={datosPrueba.data} />
      )}
    </>
  );
  const cabecera = {
    title: "Suscripciones",
    description: "Tu ingreso recurrente, las altas y bajas del mes, la mora y cuánto se quedan los clientes.",
    helpSection: "subscriptions",
  };

  if (!metricas.ok) {
    return (
      <DashboardPage header={cabecera} notices={aviso}>
        <p role="alert" className="col-span-full text-status-danger-fg">
          No se pudieron cargar las métricas: {metricas.error}
        </p>
      </DashboardPage>
    );
  }
  const m = metricas.data;
  const dinero = (v: number) => formatMoney(v, m.moneda);

  const moraColumns: Column<MetricasSuscripciones["mora"]["tramos"][number]>[] = [
    { key: "tramo", header: "Antigüedad", cell: (t) => t.etiqueta },
    { key: "cargos", header: "Cobros", align: "right", cell: (t) => <span className="tabular-nums">{formatNumber(t.cargos)}</span> },
    { key: "monto", header: "Monto", align: "right", cell: (t) => <span className="tabular-nums">{dinero(t.monto)}</span> },
  ];

  const cohorteColumns: Column<CohorteSuscripciones>[] = [
    { key: "cohorte", header: "Mes de alta", cell: (c) => mesLegible(c.cohorte) },
    { key: "plan", header: "Plan", cell: (c) => c.plan },
    { key: "altas", header: "Altas", align: "right", cell: (c) => <span className="tabular-nums">{c.altas}</span> },
    { key: "siguen", header: "Siguen hoy", align: "right", cell: (c) => <span className="tabular-nums">{c.vigentes}</span> },
    {
      key: "retencion",
      header: "Retención",
      align: "right",
      info: "De las altas de ese mes, cuántas no están canceladas hoy.",
      cell: (c) => <span className="tabular-nums text-headline">{retencion(c.altas, c.vigentes)}</span>,
    },
  ];

  const moraSuscripciones: SuscripcionItem[] = conMora.ok ? conMora.data.items : [];
  const moraListaColumns: Column<SuscripcionItem>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (s) => (
        <Link href={`/suscripciones/lista/${s.id}`} className="font-medium text-link hover:underline">
          {nombreDelCliente(s.cliente)}
        </Link>
      ),
    },
    { key: "plan", header: "Plan", cell: (s) => s.plan },
    { key: "estado", header: "Estado", cell: (s) => <StatusBadge value={s.estado} map={SUBSCRIPTION_STATUS} /> },
    {
      key: "mora",
      header: "En mora",
      align: "right",
      cell: (s) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums text-headline">{formatMoney(s.en_mora, s.moneda)}</span>
          <span className="text-xs text-status-danger-fg">{textoDeMora(s.dias_mora)}</span>
        </div>
      ),
    },
  ];

  return (
    <DashboardPage header={cabecera} notices={aviso}>
      {m.otras_monedas > 0 && (
        <p role="note" className="col-span-full text-sm text-text-soft">
          Las cifras son en {m.moneda}. Hay {m.otras_monedas} suscripciones activas en otra moneda que no suman aquí.
        </p>
      )}
      <div className="col-span-full grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile
          label="Ingreso mensual recurrente"
          value={dinero(m.mrr)}
          delta={delta(m.mrr, m.mrr_mes_anterior, "el cierre del mes anterior (aproximado)")}
          hint="Activas de pago: trimestral ÷ 3, anual ÷ 12. No cuenta pruebas ni planes de $0."
        />
        <KpiTile
          label="Suscripciones activas"
          value={formatNumber(m.activas)}
          href="/suscripciones/lista?estado=activa"
          hint={`${formatNumber(m.en_prueba)} en prueba · ${formatNumber(m.pausadas)} pausadas · ${formatNumber(m.vencidas)} vencidas`}
        />
        <KpiTile
          label="En mora"
          value={dinero(m.mora.monto)}
          tone={m.mora.cargos > 0 ? "danger" : "default"}
          href="/suscripciones/pagos?vencidos=1"
          hint={m.mora.cargos === 1 ? "1 cobro vencido sin pagar" : `${formatNumber(m.mora.cargos)} cobros vencidos sin pagar`}
        />
        <KpiTile
          label="Altas del mes"
          value={formatNumber(m.altas_mes)}
          delta={delta(m.altas_mes, m.altas_mes_anterior)}
        />
        <KpiTile
          label="Bajas del mes"
          value={formatNumber(m.bajas_mes)}
          polarity="up-bad"
          delta={delta(m.bajas_mes, m.bajas_mes_anterior)}
        />
        <KpiTile
          label="Bajas sobre el inicio del mes"
          value={porcentaje(m.churn_mes)}
          polarity="up-bad"
          hint="Bajas del mes ÷ suscripciones vigentes el primer día del mes."
        />
      </div>

      <section aria-labelledby="mora" className="col-span-full flex flex-col gap-3">
        <h2 id="mora" className="text-sh-block font-display text-headline">
          Mora por antigüedad
        </h2>
        <DataTable
          columns={moraColumns}
          rows={m.mora.tramos}
          getRowKey={(t) => t.etiqueta}
          emptyTitle="Sin mora"
          emptyDescription="No hay cobros vencidos sin pagar."
          caption="Mora por antigüedad"
        />
        {moraSuscripciones.length > 0 && (
          <>
            <h3 className="text-sh-label text-headline">Quiénes están en mora</h3>
            <DataTable
              columns={moraListaColumns}
              rows={moraSuscripciones}
              getRowKey={(s) => s.id}
              emptyTitle="Sin mora"
              caption="Suscripciones en mora"
            />
            <Link href="/suscripciones/lista?con_mora=1" className="text-sm text-link hover:underline">
              Ver todas las que están en mora
            </Link>
          </>
        )}
      </section>

      <section aria-labelledby="cohortes" className="col-span-full flex flex-col gap-3">
        <h2 id="cohortes" className="text-sh-block font-display text-headline">
          Retención por plan
        </h2>
        <DataTable
          columns={cohorteColumns}
          rows={m.cohortes}
          getRowKey={(c) => `${c.cohorte}-${c.plan}`}
          emptyTitle="Todavía no hay cohortes"
          emptyDescription="Cuando tengas altas de planes de pago en los últimos seis meses, verás cuántas siguen vigentes."
          caption="Retención por mes de alta y plan"
        />
      </section>
    </DashboardPage>
  );
}
