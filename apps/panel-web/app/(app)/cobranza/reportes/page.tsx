import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { ListPage } from "@/components/templates/list-page";
import { type Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatDate, formatNumber } from "@/lib/format";

export const metadata = { title: "Reportes" };

type ReportRow = {
  cartera: string;
  clientes: number;
  prestamos: number;
  saldo: number;
  vencidas: number;
  cobrado: number;
  caja: number;
  gastos: number;
};

type Liquidation = {
  cartera: string;
  fecha: string;
  periodo: string;
  cobrado: number;
  gastos: number;
  comision: number;
};

type Reports = { filas: ReportRow[]; liquidaciones: Liquidation[] };

export default async function ReportesPage() {
  const res = await apiFetch<Reports>("/pack/cobranza/reports");
  const header = { title: "Reportes", description: "Consolidado por cartera y últimas liquidaciones." };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No se pudieron cargar los reportes" detalle={res.error} />
      </ListPage>
    );
  }
  const { filas, liquidaciones } = res.data;
  const total = (pick: (f: ReportRow) => number) => filas.reduce((acc, f) => acc + pick(f), 0);
  const vencidas = total((f) => f.vencidas);

  const portfolioColumns: Column<ReportRow>[] = [
    { key: "cartera", header: "Cartera", cell: (r) => <span className="font-medium text-headline">{r.cartera}</span> },
    { key: "clientes", header: "Clientes", align: "right", cell: (r) => formatNumber(r.clientes) },
    { key: "prestamos", header: "Préstamos", align: "right", className: "max-xl:hidden", cell: (r) => formatNumber(r.prestamos) },
    { key: "saldo", header: "Saldo", align: "right", cell: (r) => formatCop(r.saldo) },
    { key: "vencidas", header: "Cuotas vencidas", align: "right", cell: (r) => formatNumber(r.vencidas) },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (r) => formatCop(r.cobrado) },
    { key: "caja", header: "Caja", align: "right", cell: (r) => formatCop(r.caja) },
    { key: "gastos", header: "Gastos", align: "right", cell: (r) => formatCop(r.gastos) },
  ];

  const liquidationColumns: Column<Liquidation>[] = [
    { key: "fecha", header: "Fecha", cell: (l) => formatDate(l.fecha) },
    { key: "cartera", header: "Cartera", cell: (l) => <span className="font-medium text-headline">{l.cartera}</span> },
    { key: "periodo", header: "Periodo", cell: (l) => <span className="text-body">{l.periodo}</span> },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (l) => formatCop(l.cobrado) },
    { key: "gastos", header: "Gastos", align: "right", cell: (l) => formatCop(l.gastos) },
    { key: "comision", header: "Comisión", align: "right", cell: (l) => formatCop(l.comision) },
  ];

  return (
    <ListPage header={header}>
      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile label="Saldo en cartera" value={formatCop(total((f) => f.saldo))} size="hero" />
        <KpiTile
          label="Cuotas vencidas"
          value={formatNumber(vencidas)}
          tone={vencidas > 0 ? "danger" : "default"}
          size="hero"
        />
        <KpiTile label="Cobrado" value={formatCop(total((f) => f.cobrado))} size="hero" />
      </div>
      <p className="text-sm text-body">
        {formatNumber(total((f) => f.clientes))} clientes · Caja total: {formatCop(total((f) => f.caja))} · Gastos: {formatCop(total((f) => f.gastos))}
      </p>

      <section aria-labelledby="por-cartera" className="flex flex-col gap-3">
        <h2 id="por-cartera" className="font-display text-sh-block text-headline">
          Por cartera
        </h2>
        <TablaResponsiva
          etiqueta="Por cartera"
          columns={portfolioColumns}
          rows={filas}
          getRowKey={(r) => r.cartera}
          emptyTitle="Sin carteras"
          emptyDescription="Crea una cartera para ver su consolidado."
          filaCelular={(r) => ({
            titulo: r.cartera,
            detalle: `${formatNumber(r.vencidas)} cuotas vencidas · Cobrado ${formatCop(r.cobrado)}`,
            fin: formatCop(r.saldo),
          })}
        />
      </section>

      <section aria-labelledby="liquidaciones" className="flex flex-col gap-3">
        <h2 id="liquidaciones" className="font-display text-sh-block text-headline">
          Liquidaciones recientes
        </h2>
        <TablaResponsiva
          etiqueta="Liquidaciones recientes"
          columns={liquidationColumns}
          rows={liquidaciones}
          getRowKey={(l, i) => `${l.fecha}-${l.cartera}-${i}`}
          emptyTitle="Sin liquidaciones"
          emptyDescription="Las liquidaciones de caja aparecerán aquí."
          filaCelular={(l) => ({
            titulo: l.cartera,
            detalle: `${l.periodo} · ${formatDate(l.fecha)}`,
            fin: formatCop(l.cobrado),
          })}
        />
      </section>
    </ListPage>
  );
}
