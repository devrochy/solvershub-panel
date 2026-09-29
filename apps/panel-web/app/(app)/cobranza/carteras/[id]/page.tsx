import Link from "next/link";
import { notFound } from "next/navigation";
import { Eye, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import {
  ClientFormDialog,
  ClientRowActions,
  RIESGO_LABEL,
  type CarteraOpcion,
  type Cliente,
} from "../../clientes/_components/client-dialog";
import { ExpenseFormDialog, ExpenseRowActions } from "./_components/expense-approve";
import { formatCop, formatDate, formatNumber } from "@/lib/format";
import {
  CashAdjustDialog,
  CashDayActions,
  InjectionDialog,
  LiquidationDialog,
} from "./_components/cash-actions";
import { NotesCard } from "./_components/notes-card";
import { RouteOptimizeButton } from "./_components/route-actions";
import { PortfolioConfigDialog } from "./_components/portfolio-config-dialog";

export const metadata = { title: "Detalle de cartera" };

const RIESGO_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  blanco: "neutral",
  azul: "accent",
  rojo: "danger",
};

type Nota = { id: string; nota: string; fecha: string; autor: string };

type RutaCliente = {
  id: string;
  cliente: string;
  saldo: number;
  mora: number;
  riesgo: string;
};

type RutaOut = {
  clientes: RutaCliente[];
  plan: { orden: string[]; distancia_km: number; tiempo_min: number; fecha: string } | null;
};

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
  gastos: { id: string; fecha: string; descripcion: string; valor: number; aprobado: boolean }[];
  estadisticas: { fecha: string; datos: Record<string, unknown> }[];
};

export default async function CarteraDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, configRes, notasRes, rutaRes, clientesRes, carterasRes] = await Promise.all([
    apiFetch<PortfolioDetail>(`/pack/cobranza/portfolios/${id}`),
    apiFetch<{ values: Record<string, unknown> }>(`/pack/cobranza/portfolios/${id}/config`),
    apiFetch<Nota[]>(`/pack/cobranza/portfolios/${id}/notes`),
    apiFetch<RutaOut>(`/pack/cobranza/portfolios/${id}/route`),
    apiFetch<Cliente[]>(`/pack/cobranza/clients?cartera_id=${id}`),
    apiFetch<CarteraOpcion[]>("/pack/cobranza/portfolios"),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar la cartera: {res.error}
      </p>
    );
  }
  const c = res.data;
  const configValues = configRes.ok ? configRes.data.values : {};
  const notas = notasRes.ok ? notasRes.data : [];
  const ruta = rutaRes.ok ? rutaRes.data : { clientes: [], plan: null };
  const clientes = clientesRes.ok ? clientesRes.data : [];
  const carteras = carterasRes.ok ? carterasRes.data : [];

  const clientColumns: Column<Cliente>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (cl) => (
        <span className="text-headline">{`${cl.nombre} ${cl.apellido}`.trim()}</span>
      ),
    },
    {
      key: "telefono",
      header: "Teléfono",
      cell: (cl) => <span className="text-body">{cl.telefono || "—"}</span>,
    },
    {
      key: "negocio",
      header: "Negocio",
      cell: (cl) => <span className="text-body">{cl.negocio || "—"}</span>,
    },
    {
      key: "tope",
      header: "Tope de deuda",
      align: "right",
      cell: (cl) => (cl.tope_maximo_deuda > 0 ? formatCop(cl.tope_maximo_deuda) : "—"),
    },
    {
      key: "riesgo",
      header: "Riesgo",
      cell: (cl) => (
        <Badge variant={RIESGO_TONE[cl.color_riesgo] ?? "neutral"}>
          {RIESGO_LABEL[cl.color_riesgo] ?? cl.color_riesgo}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (cl) => (
        <div className="flex items-center justify-end gap-1">
          <Button asChild aria-label="Ver ficha" size="icon" title="Ver ficha" variant="outline">
            <Link href={`/cobranza/clientes/${cl.id}`}>
              <Eye className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
          <ClientRowActions cliente={cl} carteras={carteras} />
        </div>
      ),
    },
  ];

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
      cell: (r) => <span className={r.mora > 0 ? "text-danger" : "text-body"}>{r.mora}</span>,
    },
  ];

  const liquidationColumns: Column<PortfolioDetail["liquidaciones"][number]>[] = [
    { key: "fecha", header: "Fecha", cell: (l) => formatDate(l.fecha) },
    { key: "periodo", header: "Periodo", cell: (l) => <span className="text-body">{l.periodo}</span> },
    { key: "cobrado", header: "Cobrado", align: "right", cell: (l) => formatCop(l.cobrado) },
    { key: "gastos", header: "Gastos", align: "right", cell: (l) => formatCop(l.gastos) },
    { key: "comision", header: "Comisión", align: "right", cell: (l) => formatCop(l.comision) },
  ];

  const estadisticaColumns: Column<{ fecha: string; datos: Record<string, unknown> }>[] = [
    { key: "fecha", header: "Fecha", cell: (e) => formatDate(e.fecha) },
    {
      key: "datos",
      header: "Datos del cierre",
      cell: (e) => (
        <span className="text-body text-xs" title={JSON.stringify(e.datos)}>
          {Object.entries(e.datos)
            .slice(0, 5)
            .map(([k, v]) => `${k}: ${String(v)}`)
            .join(" · ") || "—"}
        </span>
      ),
    },
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
            <PortfolioConfigDialog
              portfolioId={c.id}
              values={configValues}
              trigger={<Button variant="outline">Configuración</Button>}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">
            Clientes ({formatNumber(c.clientes)})
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {carteras.length > 0 && (
              <ClientFormDialog
                carteras={carteras}
                defaultCarteraId={c.id}
                trigger={
                  <Button variant="accent">
                    <Plus className="h-4 w-4" aria-hidden /> Nuevo cliente
                  </Button>
                }
              />
            )}
            <Button asChild variant="outline">
              <Link href={`/cobranza/clientes?cartera=${c.id}`}>Ver todos</Link>
            </Button>
          </div>
        </div>
        <DataTable
          columns={clientColumns}
          rows={clientes}
          getRowKey={(cl) => cl.id}
          emptyTitle="Sin clientes en esta cartera"
          emptyDescription="Agrega el primer cliente con «Nuevo cliente»: queda asignado a esta cartera."
        />
      </section>

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

      <NotesCard notes={notas} portfolioId={c.id} />

    </div>
  );
}