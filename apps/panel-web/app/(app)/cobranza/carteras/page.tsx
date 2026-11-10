import { Plus } from "lucide-react";

import { ErrorDeCobranza } from "@/components/domain/cobranza/error-de-cobranza";
import { TablaCobranza } from "@/components/domain/cobranza/tabla-cobranza";
import { StatusBadge } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { Button } from "@/components/ui/button";
import { type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { CARTERA_STATUS } from "@/lib/cobranza/presentacion";
import { formatCop, formatNumber } from "@/lib/format";
import {
  PortfolioFormDialog,
  PortfolioRowActions,
  type Cartera,
  type Gestor,
} from "./_components/portfolio-dialog";
import { BuscarCliente } from "./_components/buscar-cliente";

export const metadata = { title: "Carteras" };

type FilaDeReporte = { cartera: string; clientes: number; saldo: number; vencidas: number };

export default async function CarterasPage() {
  const [res, gestoresRes, reportesRes] = await Promise.all([
    apiFetch<Cartera[]>("/pack/cobranza/portfolios"),
    apiFetch<Gestor[]>("/pack/cobranza/collectors"),
    apiFetch<{ filas: FilaDeReporte[] }>("/pack/cobranza/reports"),
  ]);
  const gestores = gestoresRes.ok ? gestoresRes.data : [];
  const nuevaCartera = (
    <PortfolioFormDialog
      gestores={gestores}
      trigger={
        <Button variant="accent">
          <Plus className="h-4 w-4" aria-hidden /> Nueva cartera
        </Button>
      }
    />
  );
  const header = { title: "Carteras", actions: nuevaCartera };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCobranza titulo="No se pudieron cargar las carteras" detalle={res.error} />
      </ListPage>
    );
  }

  // Las cifras vienen del consolidado; quien no puede ver reportes ve la lista sin ellas.
  const reporte = new Map((reportesRes.ok ? reportesRes.data.filas : []).map((f) => [f.cartera, f]));
  const conCifras = reportesRes.ok;

  const columns: Column<Cartera>[] = [
    {
      key: "nombre",
      header: "Cartera",
      cell: (c) => (
        <div className="flex flex-col">
          <span className="font-medium text-headline">{c.nombre}</span>
          <span className="text-xs text-text-soft">{c.gestor ?? "Sin gestor"}</span>
        </div>
      ),
    },
    ...(conCifras
      ? ([
          { key: "clientes", header: "Clientes", align: "right", cell: (c) => formatNumber(reporte.get(c.nombre)?.clientes ?? 0) },
          { key: "saldo", header: "Saldo", align: "right", cell: (c) => formatCop(reporte.get(c.nombre)?.saldo ?? 0) },
          { key: "vencidas", header: "Cuotas vencidas", align: "right", cell: (c) => formatNumber(reporte.get(c.nombre)?.vencidas ?? 0) },
        ] satisfies Column<Cartera>[])
      : []),
    {
      key: "condiciones",
      header: "Condiciones",
      className: "max-xl:hidden",
      cell: (c) => (
        <span className="whitespace-nowrap text-body">
          {c.num_cuotas} cuotas · {c.tipo_interes} %
        </span>
      ),
    },
    { key: "estatus", header: "Estado", cell: (c) => <StatusBadge value={c.estatus} map={CARTERA_STATUS} /> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-10",
      cell: (c) => (
        <div className="relative z-10 w-fit">
          <PortfolioRowActions cartera={c} gestores={gestores} />
        </div>
      ),
    },
  ];

  return (
    <ListPage header={header} filters={<BuscarCliente />}>
      <TablaCobranza
        etiqueta="Carteras"
        columns={columns}
        rows={res.data}
        getRowKey={(c) => c.id}
        getRowHref={(c) => `/cobranza/carteras/${c.id}`}
        getRowLabel={(c) => `Abrir la cartera ${c.nombre}`}
        emptyTitle="Crea tu primera cartera"
        emptyDescription="En una cartera agrupas clientes y préstamos, y le asignas un gestor."
        emptyAction={nuevaCartera}
        filaCelular={(c) => ({
          titulo: c.nombre,
          detalle: conCifras
            ? `${c.gestor ?? "Sin gestor"} · ${formatNumber(reporte.get(c.nombre)?.vencidas ?? 0)} cuotas vencidas`
            : (c.gestor ?? "Sin gestor"),
          fin: conCifras ? formatCop(reporte.get(c.nombre)?.saldo ?? 0) : undefined,
          href: `/cobranza/carteras/${c.id}`,
          accion: <PortfolioRowActions cartera={c} gestores={gestores} />,
        })}
      />
    </ListPage>
  );
}
