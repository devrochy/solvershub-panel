import { notFound } from "next/navigation";

import { DataTable, type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatDate, formatNumber } from "@/lib/format";
import { RouteOptimizeButton } from "../../_components/route-actions";
import { cargarCartera, type ReporteDiario, type RutaCliente, type RutaOut } from "../../_lib/cartera";

export const metadata = { title: "Ruta de la cartera" };

/** Resumen legible de un snapshot de cierre (aplana `conteos` y similares). */
function resumenDatos(datos: Record<string, unknown>): string {
  const partes: string[] = [];
  for (const [clave, valor] of Object.entries(datos)) {
    if (valor === null || valor === undefined) continue;
    if (typeof valor === "object") {
      const sub = Object.entries(valor as Record<string, unknown>)
        .filter(([, interno]) => typeof interno !== "object")
        .map(([k, v]) => `${k}: ${String(v)}`)
        .join(", ");
      if (sub) partes.push(`${clave}: ${sub}`);
    } else {
      partes.push(`${clave}: ${String(valor)}`);
    }
  }
  return partes.join(" · ") || "—";
}

export default async function CarteraRutaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, rutaRes] = await Promise.all([
    cargarCartera(id),
    apiFetch<RutaOut>(`/pack/cobranza/portfolios/${id}/route`),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return null; // el layout ya muestra el error
  }
  const c = res.data;
  const ruta = rutaRes.ok ? rutaRes.data : { clientes: [], plan: null };
  // Tolerante a una API vieja (despliegue desfasado): sin campos nuevos no rompe.
  const reportesDiarios = c.reportes_diarios ?? [];

  const rutaColumns = (orden: string[]): Column<RutaCliente>[] => [
    {
      key: "orden",
      header: "#",
      cell: (r) => {
        const pos = orden.indexOf(r.id);
        return <span className="text-body">{pos >= 0 ? pos + 1 : "—"}</span>;
      },
    },
    { key: "cliente", header: "Cliente", cell: (r) => <span className="text-headline">{r.cliente}</span> },
    { key: "saldo", header: "Saldo", align: "right", cell: (r) => formatCop(r.saldo) },
    {
      key: "mora",
      header: "Mora (días)",
      align: "right",
      cell: (r) => <span className={r.mora > 0 ? "text-status-danger-fg" : "text-body"}>{r.mora}</span>,
    },
  ];

  const estadisticaColumns: Column<{ fecha: string; datos: Record<string, unknown> }>[] = [
    { key: "fecha", header: "Fecha", cell: (e) => formatDate(e.fecha) },
    {
      key: "datos",
      header: "Datos del cierre",
      cell: (e) => (
        <span className="text-body text-xs" title={JSON.stringify(e.datos)}>
          {resumenDatos(e.datos)}
        </span>
      ),
    },
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
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">Trayectoria del día</h2>
          <RouteOptimizeButton portfolioId={c.id} />
        </div>
        {ruta.plan && (
          <p className="text-sm text-body">
            Último plan ({ruta.plan.fecha}): <strong>{ruta.plan.orden.length}</strong> visitas ·{" "}
            <strong>{ruta.plan.distancia_km} km</strong> · ~{ruta.plan.tiempo_min} min
          </p>
        )}
        <DataTable
          columns={rutaColumns(ruta.plan?.orden ?? [])}
          rows={ruta.clientes}
          getRowKey={(r) => r.id}
          emptyTitle="Sin clientes para visitar"
          emptyDescription="Aparecen los clientes con préstamo vigente y cuotas pendientes."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Reportes diarios</h2>
        <DataTable
          columns={reporteColumns}
          rows={reportesDiarios}
          getRowKey={(r) => r.fecha}
          emptyTitle="Sin reportes diarios"
          emptyDescription="Los cierres que genera la app de campo aparecerán aquí."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">
          Cierres del día (estadísticas)
        </h2>
        <DataTable
          columns={estadisticaColumns}
          rows={c.estadisticas}
          getRowKey={(e, i) => `${e.fecha}-${i}`}
          emptyTitle="Sin cierres"
          emptyDescription="Genera el cierre del día desde la tarjeta Caja para ver aquí sus números."
        />
      </section>
    </div>
  );
}
