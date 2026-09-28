import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
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
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los reportes: {res.error}
      </p>
    );
  }
  const { filas, liquidaciones } = res.data;
  const total = (pick: (f: ReportRow) => number) => filas.reduce((acc, f) => acc + pick(f), 0);

  const portfolioColumns: Column<ReportRow>[] = [
    { key: "cartera", header: "Cartera", cell: (r) => <span className="text-headline">{r.cartera}</span> },
    { key: "clientes", header: "Clientes", align: "right", cell: (r) => formatNumber(r.clientes) },
    { key: "prestamos", header: "Préstamos", align: "right", cell: (r) => formatNumber(r.prestamos) },
    { key: "saldo", header: "Saldo", align: "right", cell: (r) => formatCop(r.saldo) },
    {
      key: "vencidas",
      header: "Cuotas vencidas",
      align: "right",
      cell: (r) => formatNumber(r.vencidas),
    },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (r) => formatCop(r.cobrado) },
    { key: "caja", header: "Caja", align: "right", cell: (r) => formatCop(r.caja) },
    { key: "gastos", header: "Gastos", align: "right", cell: (r) => formatCop(r.gastos) },
  ];

  const liquidationColumns: Column<Liquidation>[] = [
    { key: "fecha", header: "Fecha", cell: (l) => formatDate(l.fecha) },
    { key: "cartera", header: "Cartera", cell: (l) => <span className="text-headline">{l.cartera}</span> },
    { key: "periodo", header: "Periodo", cell: (l) => <span className="text-body">{l.periodo}</span> },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (l) => formatCop(l.cobrado) },
    { key: "gastos", header: "Gastos", align: "right", cell: (l) => formatCop(l.gastos) },
    { key: "comision", header: "Comisión", align: "right", cell: (l) => formatCop(l.comision) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reportes"
        description="Consolidado por cartera y últimas liquidaciones."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes" value={formatNumber(total((f) => f.clientes))} />
        <StatCard label="Saldo en cartera" value={formatCop(total((f) => f.saldo))} />
        <StatCard label="Cuotas vencidas" value={formatNumber(total((f) => f.vencidas))} />
        <StatCard label="Caja total" value={formatCop(total((f) => f.caja))} />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Por cartera</h2>
        <DataTable
          columns={portfolioColumns}
          rows={filas}
          getRowKey={(r) => r.cartera}
          emptyTitle="Sin carteras"
          emptyDescription="Crea una cartera en el panel clásico para ver su consolidado."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Liquidaciones recientes</h2>
        <DataTable
          columns={liquidationColumns}
          rows={liquidaciones}
          getRowKey={(l, i) => `${l.fecha}-${l.cartera}-${i}`}
          emptyTitle="Sin liquidaciones"
          emptyDescription="Las liquidaciones de caja aparecerán aquí."
        />
      </section>
    </div>
  );
}
