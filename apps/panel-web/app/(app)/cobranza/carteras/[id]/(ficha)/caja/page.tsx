import { notFound } from "next/navigation";

import { SeccionPlegada } from "@/components/domain/cobranza/seccion-plegada";
import { TablaCobranza } from "@/components/domain/cobranza/tabla-cobranza";
import { StatusBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { type Column } from "@/components/ui/data-table";
import { INYECCION_STATUS, fechaHoraDeApi } from "@/lib/cobranza/presentacion";
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
  // Lo que falta aprobar va primero.
  const gastos = [...c.gastos].sort((a, b) => Number(a.aprobado) - Number(b.aprobado));

  const liquidationColumns: Column<PortfolioDetail["liquidaciones"][number]>[] = [
    { key: "fecha", header: "Fecha", cell: (l) => formatDate(l.fecha) },
    { key: "periodo", header: "Periodo", cell: (l) => <span className="text-body">{l.periodo}</span> },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (l) => formatCop(l.cobrado) },
    { key: "gastos", header: "Gastos", align: "right", cell: (l) => formatCop(l.gastos) },
    { key: "comision", header: "Comisión", align: "right", cell: (l) => formatCop(l.comision) },
  ];

  const injectionColumns: Column<PortfolioDetail["inyecciones"][number]>[] = [
    { key: "fecha", header: "Fecha", cell: (i) => <span className="text-body">{formatDate(i.fecha)}</span> },
    { key: "valor", header: "Valor", align: "right", cell: (i) => formatCop(i.valor) },
    { key: "comentario", header: "Comentario", cell: (i) => <span className="text-body">{i.comentario || "—"}</span> },
    { key: "estado", header: "Estado", cell: (i) => <StatusBadge value={i.estado} map={INYECCION_STATUS} /> },
  ];

  const expenseColumns: Column<PortfolioDetail["gastos"][number]>[] = [
    { key: "fecha", header: "Fecha", cell: (g) => <span className="text-body">{formatDate(g.fecha)}</span> },
    { key: "descripcion", header: "Descripción", cell: (g) => <span className="font-medium text-headline">{g.descripcion}</span> },
    { key: "valor", header: "Valor", align: "right", cell: (g) => formatCop(g.valor) },
    {
      key: "aprobado",
      header: "Estado",
      cell: (g) => <Badge variant={g.aprobado ? "success" : "warning"}>{g.aprobado ? "Aprobado" : "Por aprobar"}</Badge>,
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (g) => <ExpenseRowActions expense={g} portfolioId={c.id} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
          <div>
            <p className="text-sh-label font-normal text-body">Saldo actual de la caja</p>
            <p className="font-display text-sh-hero tabular-nums text-headline">{formatCop(c.caja.saldo_actual)}</p>
            <p className="text-xs text-text-soft">
              Inicial {formatCop(c.caja.saldo_inicial)}
              {c.caja.actualizado ? ` · actualizada ${fechaHoraDeApi(c.caja.actualizado)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <CashDayActions portfolioId={c.id} />
            <InjectionDialog portfolioId={c.id} />
            <LiquidationDialog portfolioId={c.id} />
          </div>
        </CardContent>
      </Card>

      <section aria-labelledby="gastos" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="gastos" className="font-display text-sh-block text-headline">
            Gastos
          </h2>
          <ExpenseFormDialog
            portfolioId={c.id}
            trigger={<Button variant="outline">Registrar gasto</Button>}
          />
        </div>
        <TablaCobranza
          etiqueta="Gastos"
          columns={expenseColumns}
          rows={gastos}
          getRowKey={(g) => g.id}
          emptyTitle="Sin gastos"
          emptyDescription="Los gastos reportados por los gestores aparecerán aquí."
          filaCelular={(g) => ({
            titulo: g.descripcion,
            detalle: `${formatDate(g.fecha)} · ${formatCop(g.valor)}${g.aprobado ? " · Aprobado" : ""}`,
            accion: <ExpenseRowActions expense={g} portfolioId={c.id} />,
          })}
        />
      </section>

      <div className="flex flex-col gap-3">
        <SeccionPlegada titulo="Liquidaciones" conteo={c.liquidaciones.length}>
          <TablaCobranza
            etiqueta="Liquidaciones"
            columns={liquidationColumns}
            rows={c.liquidaciones}
            getRowKey={(l, i) => `${l.fecha}-${i}`}
            density="compact"
            emptyTitle="Sin liquidaciones"
            emptyDescription="Las liquidaciones de caja de esta cartera aparecerán aquí."
            filaCelular={(l) => ({
              titulo: l.periodo,
              detalle: `${formatDate(l.fecha)} · Comisión ${formatCop(l.comision)}`,
              fin: formatCop(l.cobrado),
            })}
          />
        </SeccionPlegada>
        <SeccionPlegada titulo="Inyecciones de capital" conteo={c.inyecciones.length}>
          <TablaCobranza
            etiqueta="Inyecciones de capital"
            columns={injectionColumns}
            rows={c.inyecciones}
            getRowKey={(i, idx) => `${i.fecha}-${idx}`}
            density="compact"
            emptyTitle="Sin inyecciones"
            emptyDescription="Los aportes de capital a la cartera aparecerán aquí."
            filaCelular={(i) => ({ titulo: i.comentario || "Aporte de capital", detalle: formatDate(i.fecha), fin: formatCop(i.valor) })}
          />
        </SeccionPlegada>
      </div>
    </div>
  );
}
