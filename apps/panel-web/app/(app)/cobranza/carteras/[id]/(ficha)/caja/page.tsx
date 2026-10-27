import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatCop, formatDate } from "@/lib/format";
import { CashDayActions, InjectionDialog, LiquidationDialog } from "../../_components/cash-actions";
import { ExpenseFormDialog, ExpenseRowActions } from "../../_components/expense-approve";
import { cargarCartera, type PortfolioDetail } from "../../_lib/cartera";

export const metadata = { title: "Caja de la cartera" };

export default async function CarteraCajaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await cargarCartera(id);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return null; // el layout ya muestra el error
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
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (g) => <ExpenseRowActions expense={g} portfolioId={c.id} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">Gastos</h2>
          <ExpenseFormDialog
            portfolioId={c.id}
            trigger={<Button variant="outline">Registrar gasto</Button>}
          />
        </div>
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
