import { notFound } from "next/navigation";

import { SeccionPlegada } from "@/components/domain/cobranza/seccion-plegada";
import { TablaCobranza } from "@/components/domain/cobranza/tabla-cobranza";
import { StatusBadge } from "@/components/domain/status-badge";
import { type Column } from "@/components/ui/data-table";
import { apiFetch, getBusinessTimezone } from "@/lib/api/server";
import { fechaDeHoy } from "@/lib/cobranza/agenda";
import { RIESGO_STATUS, cifrasDelCierre, diasDeMora, etiquetaDeRiesgo } from "@/lib/cobranza/presentacion";
import { formatCop, formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RouteOptimizeButton } from "../../_components/route-actions";
import { cargarCartera, type ReporteDiario, type RutaCliente, type RutaOut } from "../../_lib/cartera";

export const metadata = { title: "Ruta de la cartera" };

function Posicion({ valor }: { valor: number | null }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold tabular-nums text-body">
      {valor ?? "—"}
    </span>
  );
}

export default async function CarteraRutaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, rutaRes, zona] = await Promise.all([
    cargarCartera(id),
    apiFetch<RutaOut>(`/pack/cobranza/portfolios/${id}/route`),
    getBusinessTimezone(),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return null; // el layout ya muestra el error
  }
  const c = res.data;
  const ruta = rutaRes.ok ? rutaRes.data : { clientes: [], plan: null };
  // Tolerante a una API vieja (despliegue desfasado): sin campos nuevos no rompe.
  const reportesDiarios = c.reportes_diarios ?? [];

  // La lista se recorre en el orden del plan; quien no está en él va al final.
  const orden = ruta.plan?.orden ?? [];
  const posicion = (r: RutaCliente) => {
    const indice = orden.indexOf(r.id);
    return indice >= 0 ? indice + 1 : null;
  };
  const clientes = [...ruta.clientes].sort((a, b) => (posicion(a) ?? Infinity) - (posicion(b) ?? Infinity));
  const hrefCliente = (r: RutaCliente) => `/cobranza/carteras/${c.id}/clientes/${r.id}`;

  const resumenDelPlan = ruta.plan
    ? [
        `${formatNumber(ruta.plan.orden.length)} visitas`,
        `${ruta.plan.distancia_km.toLocaleString("es-CO")} km`,
        `unos ${formatNumber(ruta.plan.tiempo_min)} minutos`,
        ruta.plan.fecha === fechaDeHoy(zona) ? "plan de hoy" : `plan del ${formatDate(ruta.plan.fecha)}`,
      ].join(" · ")
    : "Todavía no hay un plan. Optimiza la ruta para ordenar las visitas.";

  const rutaColumns: Column<RutaCliente>[] = [
    { key: "orden", header: "Orden", className: "w-16", cell: (r) => <Posicion valor={posicion(r)} /> },
    { key: "cliente", header: "Cliente", cell: (r) => <span className="font-medium text-headline">{r.cliente}</span> },
    { key: "riesgo", header: "Riesgo", cell: (r) => <StatusBadge value={r.riesgo} map={RIESGO_STATUS} /> },
    { key: "saldo", header: "Saldo", align: "right", cell: (r) => formatCop(r.saldo) },
    {
      key: "mora",
      header: "Mora",
      align: "right",
      cell: (r) => <span className={cn("whitespace-nowrap", r.mora > 0 ? "text-status-danger-fg" : "text-body")}>{diasDeMora(r.mora)}</span>,
    },
  ];

  const estadisticaColumns: Column<{ fecha: string; datos: Record<string, unknown> }>[] = [
    { key: "fecha", header: "Fecha", className: "w-28", cell: (e) => formatDate(e.fecha) },
    { key: "datos", header: "Cifras del cierre", cell: (e) => <span className="text-body">{cifrasDelCierre(e.datos)}</span> },
  ];

  const reporteColumns: Column<ReporteDiario>[] = [
    { key: "fecha", header: "Fecha", cell: (r) => formatDate(r.fecha) },
    {
      key: "horario",
      header: "Horario",
      cell: (r) => (
        <span className="text-body">
          {r.inicio || r.fin ? `${r.inicio || "—"} – ${r.fin || "—"}` : "—"}
        </span>
      ),
    },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (r) => formatCop(r.cobrado) },
    { key: "prestado", header: "Prestado", align: "right", cell: (r) => formatCop(r.prestado) },
    { key: "visitados", header: "Visitados", align: "right", cell: (r) => formatNumber(r.visitados) },
    {
      key: "sin_pago",
      header: "Sin pago",
      align: "right",
      cell: (r) => (
        <span className={r.sin_pago > 0 ? "text-status-danger-fg" : "text-body"}>
          {formatNumber(r.sin_pago)}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="ruta-de-hoy" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col">
            <h2 id="ruta-de-hoy" className="font-display text-sh-block text-headline">
              Ruta de hoy
            </h2>
            <p className="text-sm text-body">{resumenDelPlan}</p>
          </div>
          <RouteOptimizeButton portfolioId={c.id} />
        </div>
        <TablaCobranza
          etiqueta="Clientes de la ruta"
          columns={rutaColumns}
          rows={clientes}
          getRowKey={(r) => r.id}
          getRowHref={hrefCliente}
          getRowLabel={(r) => `Abrir la ficha de ${r.cliente}`}
          emptyTitle="Sin clientes para visitar"
          emptyDescription="Aparecen los clientes con préstamo vigente y cuotas pendientes."
          filaCelular={(r) => ({
            inicio: <Posicion valor={posicion(r)} />,
            titulo: r.cliente,
            detalle: `${etiquetaDeRiesgo(r.riesgo)} · ${r.mora > 0 ? `${diasDeMora(r.mora)} de mora` : "Al día"}`,
            fin: formatCop(r.saldo),
            href: hrefCliente(r),
          })}
        />
      </section>

      <section aria-labelledby="historial-ruta" className="flex flex-col gap-3">
        <h2 id="historial-ruta" className="font-display text-sh-block text-headline">
          Historial de la ruta
        </h2>
        <SeccionPlegada titulo="Reportes diarios" conteo={reportesDiarios.length} nivel="h3">
          <TablaCobranza
            etiqueta="Reportes diarios"
            columns={reporteColumns}
            rows={reportesDiarios}
            getRowKey={(r) => r.fecha}
            density="compact"
            emptyTitle="Sin reportes diarios"
            emptyDescription="Los cierres que genera la app de campo aparecerán aquí."
            filaCelular={(r) => ({
              titulo: formatDate(r.fecha),
              detalle: `${formatNumber(r.visitados)} visitados · ${formatNumber(r.sin_pago)} sin pago`,
              fin: formatCop(r.cobrado),
            })}
          />
        </SeccionPlegada>
        <SeccionPlegada titulo="Cierres del día" conteo={c.estadisticas.length} nivel="h3">
          <TablaCobranza
            etiqueta="Cierres del día"
            columns={estadisticaColumns}
            rows={c.estadisticas}
            getRowKey={(e, i) => `${e.fecha}-${i}`}
            density="compact"
            emptyTitle="Sin cierres"
            emptyDescription="Genera el cierre del día desde la pestaña Caja para ver aquí sus números."
            filaCelular={(e) => ({ titulo: formatDate(e.fecha), detalle: cifrasDelCierre(e.datos) })}
          />
        </SeccionPlegada>
      </section>
    </div>
  );
}
