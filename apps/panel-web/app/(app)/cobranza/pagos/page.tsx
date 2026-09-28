import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatDateTime } from "@/lib/format";

export const metadata = { title: "Pagos de clientes" };

type Payment = {
  id: string;
  cliente: string;
  valor: number;
  metodo_pago: string;
  registrado_por: string | null;
  fecha_hora: string;
};

export default async function CobrosPage() {
  const res = await apiFetch<Payment[]>("/pack/cobranza/payments");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los pagos: {res.error}
      </p>
    );
  }

  const columns: Column<Payment>[] = [
    { key: "cliente", header: "Cliente", cell: (p) => <span className="text-headline">{p.cliente}</span> },
    { key: "valor", header: "Valor", align: "right", cell: (p) => formatCop(p.valor) },
    { key: "metodo", header: "Método", cell: (p) => <Badge variant="neutral">{p.metodo_pago}</Badge> },
    {
      key: "registrado",
      header: "Registrado por",
      cell: (p) => <span className="text-body">{p.registrado_por ?? "—"}</span>,
    },
    {
      key: "fecha",
      header: "Fecha",
      cell: (p) => <span className="text-body">{formatDateTime(p.fecha_hora)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pagos de clientes" description="Últimos pagos registrados por los gestores (hasta 100)." />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(p) => p.id}
        emptyTitle="Sin cobros registrados"
        emptyDescription="Los pagos de la app de campo y del agente aparecerán aquí."
      />
    </div>
  );
}
