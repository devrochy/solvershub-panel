import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatDate } from "@/lib/format";
import { RIESGO_LABEL } from "../_components/client-dialog";
import { LoanFormDialog, MovementDialog } from "./_components/loan-dialogs";
import { ChangeActions } from "./_components/change-actions";
import { CreditDelete, InstallmentEditor } from "./_components/installment-dialog";

export const metadata = { title: "Ficha del cliente" };

type Cuota = { id: string; numero: number; valor: number; vence: string; estatus: string };
type Prestamo = {
  id: string;
  valor: number;
  saldo: number;
  num_cuotas: number;
  tipo_interes: number;
  fecha_otorgado: string;
  estatus: string;
  cuotas: Cuota[];
};
type Movimiento = { id: string; tipo: string; fecha: string; valor: number; metodo: string };
type ClientDetail = {
  cliente: {
    id: string;
    nombre: string;
    apellido: string;
    telefono: string;
    negocio: string;
    cartera: string;
    tope_maximo_deuda: number;
    color_riesgo: string;
  };
  prestamos: Prestamo[];
  movimientos: Movimiento[];
  cambios: {
    id: string;
    campos_propuestos: Record<string, unknown>;
    estado: string;
    solicitado_por: string;
    fecha: string;
  }[];
};

const RIESGO_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  blanco: "neutral",
  azul: "accent",
  rojo: "danger",
};

export default async function ClienteFichaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch<ClientDetail>(`/pack/cobranza/clients/${id}`);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el cliente: {res.error}
      </p>
    );
  }
  const { cliente, prestamos, movimientos, cambios } = res.data;
  const saldoTotal = prestamos.reduce((acc, p) => acc + p.saldo, 0);
  const vencidas = prestamos.reduce(
    (acc, p) => acc + p.cuotas.filter((c) => c.estatus !== "pagada").length,
    0,
  );

  const loanColumns: Column<Prestamo>[] = [
    {
      key: "otorgado",
      header: "Otorgado",
      cell: (p) => <span className="text-body">{formatDate(p.fecha_otorgado)}</span>,
    },
    { key: "valor", header: "Valor", align: "right", cell: (p) => formatCop(p.valor) },
    { key: "saldo", header: "Saldo", align: "right", cell: (p) => formatCop(p.saldo) },
    {
      key: "cuotas",
      header: "Cuotas",
      align: "right",
      cell: (p) => (
        <span className="text-body">
          {p.cuotas.filter((c) => c.estatus === "pagada").length}/{p.num_cuotas}
        </span>
      ),
    },
    {
      key: "interes",
      header: "Interés",
      align: "right",
      cell: (p) => <span className="text-body">{p.tipo_interes}%</span>,
    },
    {
      key: "acciones",
      header: "Registrar",
      align: "right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <MovementDialog
            cuotas={p.cuotas}
            loanId={p.id}
            tipo="pago"
            trigger={
              <Button size="sm" variant="outline">
                Pago
              </Button>
            }
          />
          <MovementDialog
            cuotas={p.cuotas}
            loanId={p.id}
            tipo="abono"
            trigger={
              <Button size="sm" variant="ghost">
                Abono
              </Button>
            }
          />
        </div>
      ),
    },
  ];

  const movementColumns: Column<Movimiento>[] = [
    { key: "fecha", header: "Fecha", cell: (m) => <span className="text-body">{m.fecha || "—"}</span> },
    {
      key: "tipo",
      header: "Tipo",
      cell: (m) => <Badge variant={m.tipo === "pago" ? "success" : "accent"}>{m.tipo}</Badge>,
    },
    { key: "valor", header: "Valor", align: "right", cell: (m) => formatCop(m.valor) },
    { key: "metodo", header: "Método", cell: (m) => <span className="text-body">{m.metodo || "—"}</span> },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (m) => (m.tipo === "abono" ? <CreditDelete creditId={m.id} /> : null),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${cliente.nombre} ${cliente.apellido}`.trim()}
        description={`${cliente.cartera}${cliente.negocio ? ` · ${cliente.negocio}` : ""}${
          cliente.telefono ? ` · ${cliente.telefono}` : ""
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <LoanFormDialog
              clientId={cliente.id}
              trigger={<Button variant="accent">Nuevo préstamo</Button>}
            />
            <Button asChild variant="outline">
              <Link href="/cobranza/clientes">← Clientes</Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={RIESGO_TONE[cliente.color_riesgo] ?? "neutral"}>
          {RIESGO_LABEL[cliente.color_riesgo] ?? cliente.color_riesgo}
        </Badge>
        {cliente.tope_maximo_deuda > 0 && (
          <span className="text-[13px] text-body">Tope de deuda: {formatCop(cliente.tope_maximo_deuda)}</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Préstamos" value={prestamos.length} />
        <StatCard label="Saldo total" value={formatCop(saldoTotal)} />
        <StatCard
          label="Cuotas por pagar"
          value={vencidas}
          tone={vencidas > 0 ? "warning" : "success"}
        />
      </div>

      <ChangeActions cambios={cambios} />

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Préstamos</h2>
        <DataTable
          columns={loanColumns}
          rows={prestamos}
          getRowKey={(p) => p.id}
          emptyTitle="Sin préstamos"
          emptyDescription="Crea el primero con «Nuevo préstamo»."
        />
      </section>

      {prestamos.some((p) => p.cuotas.length > 0) && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">Plan de cuotas</h2>
          {prestamos.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-sm">
                  Préstamo del {formatDate(p.fecha_otorgado)} · {formatCop(p.valor)} ·{" "}
                  {p.num_cuotas} cuotas
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2 pt-0">
                {p.cuotas.map((c) => (
                  <InstallmentEditor
                    key={c.id}
                    installment={c}
                    trigger={
                      <button
                        className="flex items-center gap-2 rounded-md border border-border-soft px-3 py-1.5 text-xs hover:bg-hover"
                        type="button"
                      >
                        <Badge variant={c.estatus === "pagada" ? "success" : "neutral"}>
                          {`#${c.numero}`}
                        </Badge>
                        <span className="text-body">{formatDate(c.vence)}</span>
                        <span className="text-headline">{formatCop(c.valor)}</span>
                      </button>
                    }
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Movimientos</h2>
        <DataTable
          columns={movementColumns}
          rows={movimientos}
          getRowKey={(m) => m.id}
          emptyTitle="Sin movimientos"
          emptyDescription="Los pagos y abonos registrados aparecerán aquí."
        />
      </section>
    </div>
  );
}
