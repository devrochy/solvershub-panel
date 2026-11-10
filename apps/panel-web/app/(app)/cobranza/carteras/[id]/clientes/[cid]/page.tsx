import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";

import { ErrorDeCobranza } from "@/components/domain/cobranza/error-de-cobranza";
import { TablaCobranza } from "@/components/domain/cobranza/tabla-cobranza";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import {
  MOVIMIENTO_STATUS,
  PRESTAMO_STATUS,
  RIESGO_STATUS,
  fechaHoraDeApi,
  metodoDePago,
} from "@/lib/cobranza/presentacion";
import { formatCop, formatFechaLarga } from "@/lib/format";
import { LoanFormDialog, MovementDialog } from "./_components/loan-dialogs";
import { ChangeActions } from "./_components/change-actions";
import { CreditDelete, CuotaDelPlan } from "./_components/installment-dialog";

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
    cartera_id: string;
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

const CUOTAS_A_LA_VISTA = 6;

/** Las cuotas que importan hoy: dos pagadas de contexto y las que siguen. El resto se pliega. */
function repartirCuotas(cuotas: Cuota[]): { aLaVista: Cuota[]; resto: Cuota[] } {
  const ordenadas = [...cuotas].sort((a, b) => a.numero - b.numero);
  const siguiente = ordenadas.findIndex((c) => c.estatus !== "pagada");
  const inicio = siguiente < 0 ? Math.max(0, ordenadas.length - CUOTAS_A_LA_VISTA) : Math.max(0, siguiente - 2);
  const fin = inicio + CUOTAS_A_LA_VISTA;
  return { aLaVista: ordenadas.slice(inicio, fin), resto: [...ordenadas.slice(0, inicio), ...ordenadas.slice(fin)] };
}

const REJILLA_DE_CUOTAS = "grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6";

function TarjetaDePrestamo({ prestamo: p }: { prestamo: Prestamo }) {
  const pagadas = p.cuotas.filter((c) => c.estatus === "pagada").length;
  const { aLaVista, resto } = repartirCuotas(p.cuotas);
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle as="h2">Préstamo del {formatFechaLarga(p.fecha_otorgado)}</CardTitle>
            {p.estatus !== "vigente" && <StatusBadge value={p.estatus} map={PRESTAMO_STATUS} />}
          </div>
          <p className="text-xs text-text-soft">
            {formatCop(p.valor)} · interés {p.tipo_interes} % · Saldo {formatCop(p.saldo)} · {pagadas} de {p.num_cuotas} cuotas pagadas
          </p>
        </div>
        {p.estatus === "vigente" && (
          <div className="flex items-center gap-2">
            <MovementDialog cuotas={p.cuotas} loanId={p.id} tipo="abono" trigger={<Button variant="ghost">Abono</Button>} />
            <MovementDialog cuotas={p.cuotas} loanId={p.id} tipo="pago" trigger={<Button variant="accent">Registrar pago</Button>} />
          </div>
        )}
      </CardHeader>
      {p.cuotas.length > 0 && (
        <CardContent className="flex flex-col gap-3">
          <div className={REJILLA_DE_CUOTAS}>
            {aLaVista.map((c) => (
              <CuotaDelPlan key={c.id} cuota={c} />
            ))}
          </div>
          {resto.length > 0 && (
            <details className="group flex flex-col gap-2">
              <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-1 rounded-sm text-sm font-medium text-link focus-visible:outline-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
                <ChevronRight aria-hidden className="h-4 w-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
                Ver las otras {resto.length} cuotas
              </summary>
              <div className={REJILLA_DE_CUOTAS}>
                {resto.map((c) => (
                  <CuotaDelPlan key={c.id} cuota={c} />
                ))}
              </div>
            </details>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default async function ClienteFichaPage({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const { id, cid } = await params;
  const res = await apiFetch<ClientDetail>(`/pack/cobranza/clients/${cid}`);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Cliente" tabs={false} />
        <ErrorDeCobranza titulo="No se pudo cargar el cliente" detalle={res.error} />
      </div>
    );
  }
  const { cliente, prestamos, movimientos, cambios } = res.data;
  // El cliente cuelga de una sola cartera: si la URL trae otra, la ficha canónica es la suya.
  if (cliente.cartera_id !== id) redirect(`/cobranza/carteras/${cliente.cartera_id}/clientes/${cliente.id}`);

  const datos = [
    cliente.negocio,
    cliente.telefono,
    cliente.tope_maximo_deuda > 0 ? `Tope de deuda: ${formatCop(cliente.tope_maximo_deuda)}` : null,
  ];

  const movementColumns: Column<Movimiento>[] = [
    { key: "fecha", header: "Fecha", cell: (m) => <span className="text-body">{fechaHoraDeApi(m.fecha)}</span> },
    { key: "tipo", header: "Tipo", cell: (m) => <StatusBadge value={m.tipo} map={MOVIMIENTO_STATUS} /> },
    { key: "metodo", header: "Método", cell: (m) => <span className="text-body">{metodoDePago(m.metodo)}</span> },
    { key: "valor", header: "Valor", align: "right", cell: (m) => formatCop(m.valor) },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (m) => (m.tipo === "abono" ? <CreditDelete creditId={m.id} /> : null),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${cliente.nombre} ${cliente.apellido}`.trim()}
        despuesDelTitulo={<StatusBadge value={cliente.color_riesgo} map={RIESGO_STATUS} />}
        migasIntermedias={[
          { label: cliente.cartera, href: `/cobranza/carteras/${cliente.cartera_id}` },
          { label: "Clientes", href: `/cobranza/carteras/${cliente.cartera_id}/clientes` },
        ]}
        description={datos.filter(Boolean).join(" · ") || undefined}
        tabs={false}
        actions={<LoanFormDialog clientId={cliente.id} trigger={<Button variant="accent">Nuevo préstamo</Button>} />}
      />

      <ChangeActions cambios={cambios} />

      {prestamos.length === 0 ? (
        <div className="rounded-lg border border-border-soft bg-surface">
          <EmptyState title="Sin préstamos" description="Crea el primero con «Nuevo préstamo»." />
        </div>
      ) : (
        prestamos.map((p) => <TarjetaDePrestamo key={p.id} prestamo={p} />)
      )}

      <section aria-labelledby="movimientos" className="flex flex-col gap-3">
        <h2 id="movimientos" className="font-display text-sh-block text-headline">
          Movimientos
        </h2>
        <TablaCobranza
          etiqueta="Movimientos"
          columns={movementColumns}
          rows={movimientos}
          getRowKey={(m) => m.id}
          emptyTitle="Sin movimientos"
          emptyDescription="Los pagos y abonos registrados aparecerán aquí."
          filaCelular={(m) => ({
            titulo: MOVIMIENTO_STATUS[m.tipo]?.label ?? m.tipo,
            detalle: `${fechaHoraDeApi(m.fecha)} · ${metodoDePago(m.metodo)}`,
            fin: formatCop(m.valor),
            accion: m.tipo === "abono" ? <CreditDelete creditId={m.id} /> : undefined,
          })}
        />
      </section>
    </div>
  );
}
