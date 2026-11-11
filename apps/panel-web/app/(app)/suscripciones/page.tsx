import Link from "next/link";

import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { DatosDePruebaDelModulo } from "@/components/domain/datos-de-prueba-modulo";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { StatusBadge, SUBSCRIPTION_SITUATION } from "@/components/domain/status-badge";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
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
  retencionPorPlan,
  situacion,
  textoDeDescuentoVigente,
  textoDeMora,
  tramosEnUnaLinea,
  variacion,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Resumen de suscripciones" };

const ANTERIOR = "el mes anterior";

function delta(actual: number, anterior: number, versus = ANTERIOR) {
  const v = variacion(actual, anterior);
  return v == null ? undefined : { value: v, versus };
}

function contar(n: number, uno: string, varios: string, ninguno?: string) {
  if (n === 0 && ninguno) return ninguno;
  return n === 1 ? `1 ${uno}` : `${formatNumber(n)} ${varios}`;
}

/**
 * Resumen de Suscripciones (SUS-01 a 04): una frase con lo que cobras y lo que te deben, tres
 * tarjetas, quién debe y cuánto se quedan. Las fórmulas viven en «¿Cómo se calcula?».
 */
export default async function ResumenSuscripcionesPage() {
  const [metricas, conMora, proveedor, datosPrueba] = await Promise.all([
    apiFetch<MetricasSuscripciones>("/pack/pack_subscriptions/metricas"),
    apiFetch<SuscripcionesPage>("/pack/pack_subscriptions/suscripciones?con_mora=true&page_size=5"),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
    apiFetch<EstadoDatosDePruebaModulo>("/admin/datos-de-prueba/suscripciones"),
  ]);
  // SUS-02: la tarjeta de datos de prueba solo aparece cuando ofrece algo (generar o borrar).
  const conDatosDePrueba = datosPrueba.ok && (datosPrueba.data.disponible || Boolean(datosPrueba.data.lote));
  const aviso = (
    <>
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      {conDatosDePrueba && <DatosDePruebaDelModulo modulo="suscripciones" estado={datosPrueba.data} />}
    </>
  );
  const cabecera = { title: "Suscripciones", helpSection: "subscriptions" };

  if (!metricas.ok) {
    return (
      <DashboardPage header={cabecera} notices={aviso}>
        <div className="col-span-full">
          <ErrorDeCarga titulo="No pudimos cargar el resumen" detalle={metricas.error} />
        </div>
      </DashboardPage>
    );
  }
  const m = metricas.data;
  const dinero = (v: number) => formatMoney(v, m.moneda);
  const deben: SuscripcionItem[] = conMora.ok ? conMora.data.items : [];
  const totalDeben = conMora.ok ? conMora.data.total : 0;
  const descuento = textoDeDescuentoVigente(m, m.moneda);
  const noSuman = [
    m.en_prueba > 0 && contar(m.en_prueba, "en prueba", "en prueba"),
    m.pausadas > 0 && contar(m.pausadas, "pausada", "pausadas"),
    m.vencidas > 0 && contar(m.vencidas, "vencida", "vencidas"),
  ].filter(Boolean);

  const debenColumns: Column<SuscripcionItem>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (s) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-headline">{nombreDelCliente(s.cliente)}</span>
          <span className="truncate text-xs text-text-soft">{s.plan}</span>
        </div>
      ),
    },
    { key: "estado", header: "Estado", cell: (s) => <StatusBadge value={situacion(s)} map={SUBSCRIPTION_SITUATION} /> },
    {
      key: "debe",
      header: "Debe",
      align: "right",
      cell: (s) => (
        <div className="flex flex-col items-end">
          <span className="tabular-nums text-headline">{formatMoney(s.deuda, s.moneda)}</span>
          <span className="whitespace-nowrap text-xs text-status-danger-fg">{textoDeMora(s.dias_mora)}</span>
        </div>
      ),
    },
  ];

  const cohorteColumns: Column<CohorteSuscripciones>[] = [
    { key: "cohorte", header: "Mes de alta", cell: (c) => mesLegible(c.cohorte) },
    { key: "plan", header: "Plan", cell: (c) => c.plan },
    { key: "altas", header: "Altas", align: "right", cell: (c) => <span className="tabular-nums">{c.altas}</span> },
    { key: "siguen", header: "Siguen hoy", align: "right", cell: (c) => <span className="tabular-nums">{c.vigentes}</span> },
    {
      key: "retencion",
      header: "Se quedan",
      align: "right",
      cell: (c) => <span className="tabular-nums text-headline">{retencion(c.altas, c.vigentes)}</span>,
    },
  ];
  const quedan = retencionPorPlan(m.cohortes);

  return (
    <DashboardPage header={cabecera} notices={aviso}>
      <div className="col-span-full flex flex-col gap-1">
        <p className="text-lg text-body">
          Cobras <strong className="text-headline">{dinero(m.mrr)} al mes</strong> de{" "}
          {contar(m.activas, "suscripción activa", "suscripciones activas")}.{" "}
          {m.mora.monto > 0 && (
            <span className="text-status-danger-fg">
              {totalDeben > 0
                ? `${contar(totalDeben, "suscripción debe", "suscripciones deben")} ${dinero(m.mora.monto)}.`
                : `Te deben ${dinero(m.mora.monto)}.`}
            </span>
          )}
        </p>
        {m.pendientes_de_pago > 0 && (
          <Link href="/suscripciones/lista?estado=pendiente_pago" className="w-fit text-sm text-link hover:underline">
            {m.pendientes_de_pago === 1
              ? "1 inscripción espera su primer pago"
              : `${formatNumber(m.pendientes_de_pago)} inscripciones esperan su primer pago`}
          </Link>
        )}
      </div>

      <div className="col-span-full grid gap-4 sm:grid-cols-3">
        <KpiTile
          label="Ingreso recurrente"
          value={dinero(m.mrr)}
          delta={delta(m.mrr, m.mrr_mes_anterior)}
          hint={descuento ? `Lo que cobras cada mes. ${descuento}` : "Lo que cobras cada mes."}
        />
        <KpiTile
          label="En mora"
          value={dinero(m.mora.monto)}
          tone={m.mora.cargos > 0 ? "danger" : "default"}
          href="/suscripciones/pagos?vencidos=1"
          hint={m.mora.cargos > 0 ? `${contar(m.mora.cargos, "cobro vencido", "cobros vencidos")} sin pagar` : "Nadie te debe."}
        />
        <KpiTile
          label="Este mes"
          value={`${contar(m.altas_mes, "alta", "altas", "Sin altas")} · ${contar(m.bajas_mes, "baja", "bajas", "sin bajas")}`}
          hint={`El mes pasado: ${contar(m.altas_mes_anterior, "alta", "altas", "ninguna alta")} y ${contar(m.bajas_mes_anterior, "baja", "bajas", "ninguna baja")}.`}
        />
      </div>

      <details className="col-span-full text-sm text-body">
        <summary className="w-fit cursor-pointer text-link hover:underline">¿Cómo se calcula?</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
          <li>
            El ingreso recurrente suma lo que pagan al mes las suscripciones activas: un plan trimestral cuenta un tercio y uno
            anual, un doceavo. No suman las pruebas, los planes de $0 ni las inscripciones sin pagar
            {noSuman.length > 0 ? ` (hoy: ${noSuman.join(", ")})` : ""}.
          </li>
          <li>Frente al mes anterior se compara con el cierre de ese mes; es una cifra aproximada.</li>
          {m.churn_mes != null && (
            <li>Este mes se fue el {porcentaje(m.churn_mes)} de las suscripciones que estaban vigentes el primer día.</li>
          )}
          {m.otras_monedas > 0 && (
            <li>
              Las cifras son en {m.moneda}. Hay {contar(m.otras_monedas, "suscripción activa", "suscripciones activas")} en otra
              moneda que no suman aquí.
            </li>
          )}
        </ul>
      </details>

      <section aria-labelledby="deben" className="col-span-full flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="deben" className="text-sh-block font-display text-headline">
            Quién debe
          </h2>
          {m.mora.cargos > 0 && <span className="text-sm text-text-soft">{tramosEnUnaLinea(m.mora.tramos)}</span>}
        </div>
        <TablaResponsiva
          etiqueta="Quién debe"
          columns={debenColumns}
          rows={deben}
          getRowKey={(s) => s.id}
          getRowHref={(s) => `/suscripciones/lista/${s.id}`}
          getRowLabel={(s) => `Abrir la suscripción de ${nombreDelCliente(s.cliente)}`}
          filaCelular={(s) => ({
            titulo: nombreDelCliente(s.cliente),
            detalle: `${s.plan} · ${textoDeMora(s.dias_mora)}`,
            fin: formatMoney(s.deuda, s.moneda),
            href: `/suscripciones/lista/${s.id}`,
          })}
          emptyTitle="Nadie te debe"
          emptyDescription="Todos los cobros vencidos están pagados."
          caption="Quién debe"
        />
        {totalDeben > deben.length && (
          <Link href="/suscripciones/lista?con_mora=1" className="w-fit text-sm text-link hover:underline">
            Ver las {formatNumber(totalDeben)} que deben
          </Link>
        )}
      </section>

      <section aria-labelledby="quedan" className="col-span-full flex flex-col gap-2">
        <h2 id="quedan" className="text-sh-block font-display text-headline">
          Cuánto se quedan
        </h2>
        {quedan.length === 0 ? (
          <p className="text-sm text-text-soft">
            Cuando tengas altas de planes de pago en los últimos seis meses, verás cuántas siguen vigentes.
          </p>
        ) : (
          <>
            <p className="text-body">{quedan.join(" · ")}.</p>
            <details className="text-sm">
              <summary className="w-fit cursor-pointer text-link hover:underline">Ver por mes de alta</summary>
              <div className="mt-3">
                <DataTable
                  columns={cohorteColumns}
                  rows={m.cohortes}
                  getRowKey={(c) => `${c.cohorte}-${c.plan}`}
                  caption="Cuánto se quedan por mes de alta y plan"
                />
              </div>
            </details>
          </>
        )}
      </section>
    </DashboardPage>
  );
}
