import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatDate, formatNumber } from "@/lib/format";
import {
  CashAdjustDialog,
  CashDayActions,
  InjectionDialog,
  LiquidationDialog,
} from "./_components/cash-actions";

export const metadata = { title: "Detalle de cartera" };

type PortfolioDetail = {
  id: string;
  nombre: string;
  descripcion: string | null;
  gestor: string | null;
  tipo_interes: number;
  num_cuotas: number;
  moneda: string;
  estatus: string;
  clientes: number;
  prestamos: number;
  saldo: number;
  caja: { saldo_inicial: number; saldo_actual: number; actualizado: string };
  liquidaciones: {
    cartera: string;
    fecha: string;
    periodo: string;
    cobrado: number;
    gastos: number;
    comision: number;
  }[];
  inyecciones: { fecha: string; valor: number; comentario: string; estado: string }[];
  gastos: { fecha: string; descripcion: string; valor: number; aprobado: boolean }[];
};

export default async function CarteraDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch<PortfolioDetail>(`/pack/cobranza/portfolios/${id}`);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar la cartera: {res.error}
      </p>
    );
  }
  const c = res.data;

  const liquidationColumns: Column<PortfolioDetail["liquidaciones"][number]>[] = [
    { key: "fecha", header: "Fecha", cell: (l) => formatDate(l.fecha) },
    { key: "periodo", header: "Periodo", cell: (l) => <span className="text-body">{l.periodo}</span> },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (l) => formatCop(l.cobrado) },
    { key: "gastos", header: "Gastos", align: "right", cell: (l) => formatCop(l.gastos) },
    { key: "comision", header: "Comisión", align: "right", cell: (l) => formatCop(l.comision) },
  ];

  const injectionColumns: Column<PortfolioDetail["inyecciones"][number]>[] = [
    { key: "fecha", header: "Fecha", cell: (i) => <span className="text-body">{i.fecha || "—"}</span> },
    { key: "valor", header: "Valor", align: "right", cell: (i) => formatCop(i.valor) },
    { key: "comentario", header: "Comentario", cell: (i) => <span className="text-body">{i.comentario || "—"}</span> },
    {
      key: "estado",
      header: "Estado",
      cell: (i) => <Badge variant={i.estado === "activa" ? "success" : "neutral"}>{i.estado}</Badge>,
    },
  ];

  const expenseColumns: Column<PortfolioDetail["gastos"][number]>[] = [
    { key: "fecha", header: "Fecha", cell: (g) => <span className="text-body">{g.fecha || "—"}</span> },
    { key: "descripcion", header: "Descripción", cell: (g) => <span className="text-headline">{g.descripcion}</span> },
    { key: "valor", header: "Valor", align: "right", cell: (g) => formatCop(g.valor) },
    {
      key: "aprobado",
      header: "Aprobado",
      cell: (g) => <Badge variant={g.aprobado ? "success" : "warning"}>{g.aprobado ? "sí" : "pendiente"}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={c.nombre}
        description={c.descripcion ?? `Cartera en ${c.moneda} · ${c.num_cuotas} cuotas · interés ${c.tipo_interes}%`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CashAdjustDialog
              portfolioId={c.id}
              saldoActual={c.caja.saldo_actual}
              trigger={<Button variant="accent">Ajustar caja</Button>}
            />
            <Button asChild variant="outline">
              <Link href="/cobranza/carteras">← Carteras</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={c.estatus === "activa" ? "success" : "neutral"}>{c.estatus}</Badge>
        <span className="text-[13px] text-body">Gestor: {c.gestor ?? "—"}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Clientes" value={formatNumber(c.clientes)} />
        <StatCard label="Préstamos" value={formatNumber(c.prestamos)} />
        <StatCard label="Saldo" value={formatCop(c.saldo)} />
        <StatCard
          label="Caja actual"
          value={formatCop(c.caja.saldo_actual)}
          hint={c.caja.actualizado ? `Actualizada ${c.caja.actualizado}` : undefined}
        />
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Caja</h2>
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
            <div>
              <p className="text-[13px] text-body">Saldo actual</p>
              <p className="font-display text-lg font-semibold text-headline">
                {formatCop(c.caja.saldo_actual)}
              </p>
              <p className="text-xs text-text-soft">
                Inicial {formatCop(c.caja.saldo_inicial)}
                {c.caja.actualizado ? ` · actualizada ${c.caja.actualizado}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InjectionDialog portfolioId={c.id} />
              <CashDayActions portfolioId={c.id} />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">Liquidaciones</h2>
          <LiquidationDialog portfolioId={c.id} />
        </div>
        <DataTable
          columns={liquidationColumns}
          rows={c.liquidaciones}
          getRowKey={(l, i) => `${l.fecha}-${i}`}
          emptyTitle="Sin liquidaciones"
          emptyDescription="Las liquidaciones de caja de esta cartera aparecerán aquí."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Inyecciones de capital</h2>
        <DataTable
          columns={injectionColumns}
          rows={c.inyecciones}
          getRowKey={(i, idx) => `${i.fecha}-${idx}`}
          emptyTitle="Sin inyecciones"
          emptyDescription="Los aportes de capital a la cartera aparecerán aquí."
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Gastos</h2>
        <DataTable
          columns={expenseColumns}
          rows={c.gastos}
          getRowKey={(g, idx) => `${g.fecha}-${idx}`}
          emptyTitle="Sin gastos"
          emptyDescription="Los gastos reportados por los gestores aparecerán aquí."
        />
      </section>
    </div>
  );
}
