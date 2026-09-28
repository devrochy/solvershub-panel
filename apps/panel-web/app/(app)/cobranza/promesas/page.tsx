import { PromiseStatus } from "@/app/(app)/cobranza/promesas/_components/promise-status";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatDate } from "@/lib/format";

export const metadata = { title: "Promesas" };

type Promise = {
  id: string;
  cliente: string;
  fecha_prometida: string;
  valor_prometido: number;
  estado: string;
  tipo: string;
  creado_por: string;
};

export default async function PromisesPage() {
  const res = await apiFetch<Promise[]>("/pack/cobranza/promises");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las promesas: {res.error}
      </p>
    );
  }

  const columns: Column<Promise>[] = [
    { key: "cliente", header: "Cliente", cell: (p) => <span className="text-headline">{p.cliente}</span> },
    {
      key: "fecha",
      header: "Fecha prometida",
      cell: (p) => <span className="text-body">{formatDate(p.fecha_prometida)}</span>,
    },
    { key: "valor", header: "Valor", align: "right", cell: (p) => formatCop(p.valor_prometido) },
    { key: "tipo", header: "Tipo", cell: (p) => <Badge variant="neutral">{p.tipo}</Badge> },
    {
      key: "origen",
      header: "Creada por",
      cell: (p) => <span className="text-body">{p.creado_por}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      align: "right",
      cell: (p) => <PromiseStatus promiseId={p.id} estado={p.estado} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Promesas"
        description="Promesas de pago del asistente y de los gestores."
      />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(p) => p.id}
        emptyTitle="Sin promesas"
        emptyDescription="Cuando el agente pacte una promesa, aparecerá aquí con su estado."
      />
    </div>
  );
}
