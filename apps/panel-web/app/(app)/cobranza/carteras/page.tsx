import { Plus, Eye } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconAction } from "@/components/ui/icon-action";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import {
  PortfolioFormDialog,
  PortfolioRowActions,
  type Cartera,
  type Gestor,
} from "./_components/portfolio-dialog";

export const metadata = { title: "Carteras" };

export default async function CarterasPage() {
  const [res, gestoresRes] = await Promise.all([
    apiFetch<Cartera[]>("/pack/cobranza/portfolios"),
    apiFetch<Gestor[]>("/pack/cobranza/collectors"),
  ]);
  const gestores = gestoresRes.ok ? gestoresRes.data : [];
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las carteras: {res.error}
      </p>
    );
  }

  const columns: Column<Cartera>[] = [
    { key: "nombre", header: "Cartera", cell: (c) => <span className="text-headline">{c.nombre}</span> },
    { key: "gestor", header: "Gestor", cell: (c) => <span className="text-body">{c.gestor ?? "—"}</span> },
    {
      key: "interes",
      header: "Interés",
      align: "right",
      cell: (c) => <span className="text-body">{c.tipo_interes}%</span>,
    },
    {
      key: "cuotas",
      header: "Cuotas",
      align: "right",
      cell: (c) => <span className="text-body">{c.num_cuotas}</span>,
    },
    { key: "moneda", header: "Moneda", cell: (c) => <Badge variant="neutral">{c.moneda}</Badge> },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <IconAction href={`/cobranza/carteras/${c.id}`} label="Ver ficha" tone="ver">
            <Eye className="h-4 w-4" aria-hidden />
          </IconAction>
          <PortfolioRowActions cartera={c} gestores={gestores} />
        </div>
      ),
    },
    {
      key: "estatus",
      header: "Estado",
      cell: (c) => <Badge variant={c.estatus === "activo" ? "success" : "neutral"}>{c.estatus}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Carteras"
        description="Carteras del negocio y su gestor asignado."
        actions={
          <PortfolioFormDialog
            gestores={gestores}
            trigger={
              <Button variant="accent">
                <Plus className="h-4 w-4" aria-hidden /> Nueva cartera
              </Button>
            }
          />
        }
      />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(c) => c.id}
        emptyTitle="Sin carteras"
        emptyDescription="Crea la primera cartera con el botón «Nueva cartera»."
      />
    </div>
  );
}
