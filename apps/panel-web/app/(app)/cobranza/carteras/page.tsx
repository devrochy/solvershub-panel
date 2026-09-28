import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Carteras" };

type Portfolio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  gestor: string | null;
  tipo_interes: number;
  num_cuotas: number;
  moneda: string;
  estatus: string;
};

export default async function CarterasPage() {
  const res = await apiFetch<Portfolio[]>("/pack/cobranza/portfolios");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las carteras: {res.error}
      </p>
    );
  }

  const columns: Column<Portfolio>[] = [
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
      key: "estatus",
      header: "Estado",
      cell: (c) => <Badge variant={c.estatus === "activo" ? "success" : "neutral"}>{c.estatus}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Carteras" description="Carteras del negocio y su gestor asignado." />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(c) => c.id}
        emptyTitle="Sin carteras"
        emptyDescription="Crea carteras en el panel clásico (o con el importador)."
      />
    </div>
  );
}
