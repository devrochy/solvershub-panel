import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";
import { formatCop, formatDate } from "@/lib/format";

export const metadata = { title: "Monitoreo IA" };

type PromiseRow = {
  id: string;
  cliente: string;
  fecha_prometida: string;
  valor_prometido: number;
  estado: string;
  tipo: string;
  creado_por: string;
};

type Monitoring = {
  conversaciones: number;
  escalaciones: number;
  promesas_pendientes: number;
  promesas_cumplidas: number;
  promesas_incumplidas: number;
  ultimas_promesas: PromiseRow[];
};

const PROMISE_TONE: Record<string, "success" | "danger" | "warning"> = {
  cumplida: "success",
  incumplida: "danger",
  pendiente: "warning",
};

export default async function MonitoreoPage() {
  const res = await apiFetch<Monitoring>("/pack/cobranza/monitoring");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el monitoreo: {res.error}
      </p>
    );
  }
  const m = res.data;

  const columns: Column<PromiseRow>[] = [
    { key: "cliente", header: "Cliente", cell: (p) => <span className="text-headline">{p.cliente}</span> },
    { key: "fecha", header: "Fecha", cell: (p) => formatDate(p.fecha_prometida) },
    { key: "valor", header: "Valor", align: "right", cell: (p) => formatCop(p.valor_prometido) },
    { key: "tipo", header: "Tipo", cell: (p) => <Badge variant="neutral">{p.tipo}</Badge> },
    {
      key: "estado",
      header: "Estado",
      cell: (p) => <Badge variant={PROMISE_TONE[p.estado] ?? "neutral"}>{p.estado}</Badge>,
    },
    { key: "origen", header: "Origen", cell: (p) => <span className="text-body">{p.creado_por}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Monitoreo IA"
        description="Actividad del agente y últimas promesas de pago."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Conversaciones" value={m.conversaciones} />
        <StatCard label="Escalaciones" value={m.escalaciones} tone={m.escalaciones > 0 ? "warning" : "default"} />
        <StatCard label="Promesas pendientes" value={m.promesas_pendientes} />
        <StatCard label="Promesas cumplidas" value={m.promesas_cumplidas} tone="success" />
        <StatCard label="Promesas incumplidas" value={m.promesas_incumplidas} tone={m.promesas_incumplidas > 0 ? "danger" : "default"} />
      </div>
      <DataTable
        columns={columns}
        rows={m.ultimas_promesas}
        getRowKey={(p) => p.id}
        emptyTitle="Sin promesas recientes"
        emptyDescription="Las promesas que capture el agente o los gestores aparecerán aquí."
      />
    </div>
  );
}
