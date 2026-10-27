import { notFound } from "next/navigation";
import { Eye, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { IconAction } from "@/components/ui/icon-action";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatNumber } from "@/lib/format";
import {
  ClientFormDialog,
  ClientRowActions,
  RIESGO_LABEL,
  type CarteraOpcion,
  type Cliente,
} from "../../../../clientes/_components/client-dialog";
import { cargarCartera } from "../../_lib/cartera";

export const metadata = { title: "Clientes de la cartera" };

const RIESGO_TONE: Record<string, "neutral" | "accent" | "danger"> = {
  blanco: "neutral",
  azul: "accent",
  rojo: "danger",
};

export default async function CarteraClientesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, clientesRes, carterasRes] = await Promise.all([
    cargarCartera(id),
    apiFetch<Cliente[]>(`/pack/cobranza/clients?cartera_id=${id}`),
    apiFetch<CarteraOpcion[]>("/pack/cobranza/portfolios"),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return null; // el layout ya muestra el error
  }
  const c = res.data;
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
          <IconAction href={`/cobranza/carteras/${c.id}/clientes/${cl.id}`} label="Ver ficha" tone="ver">
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
          <ClientRowActions cliente={cl} carteras={carteras} />
        </div>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">
          Clientes ({formatNumber(c.clientes)})
        </h2>
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
      </div>
      <DataTable
        columns={clientColumns}
        rows={clientes}
        getRowKey={(cl) => cl.id}
        emptyTitle="Sin clientes en esta cartera"
        emptyDescription="Agrega el primer cliente con «Nuevo cliente»: queda asignado a esta cartera."
      />
    </section>
  );
}
