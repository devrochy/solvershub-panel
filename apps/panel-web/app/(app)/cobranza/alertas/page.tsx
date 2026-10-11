import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Alertas de acceso" };

type AccessAttempt = {
  fecha: string;
  gestor: string;
  resultado: string;
  motivo: string;
  imei: string;
  critico: boolean;
};

type Alerts = { total: number; denegados: number; items: AccessAttempt[] };

export default async function AlertasPage() {
  const res = await apiFetch<Alerts>("/pack/cobranza/alerts");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las alertas: {res.error}
      </p>
    );
  }
  const { total, denegados, items } = res.data;

  const columns: Column<AccessAttempt>[] = [
    { key: "fecha", header: "Fecha", cell: (a) => <span className="text-body">{a.fecha || "—"}</span> },
    { key: "gestor", header: "Gestor", cell: (a) => <span className="text-headline">{a.gestor}</span> },
    {
      key: "resultado",
      header: "Resultado",
      cell: (a) => <Badge variant={a.critico ? "danger" : "success"}>{a.resultado}</Badge>,
    },
    { key: "motivo", header: "Motivo", cell: (a) => <span className="text-body">{a.motivo || "—"}</span> },
    { key: "imei", header: "IMEI", cell: (a) => <span className="text-body">{a.imei || "—"}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alertas de acceso"
        description="Últimos 100 intentos de acceso de los dispositivos de los gestores."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Intentos (últimos 100)" value={total} />
        <StatCard label="Denegados" value={denegados} tone={denegados > 0 ? "danger" : "default"} />
        <StatCard label="Correctos" value={total - denegados} tone="success" />
      </div>
      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(a, i) => `${a.fecha}-${a.imei}-${i}`}
        emptyTitle="Sin intentos de acceso"
        emptyDescription="Cuando un dispositivo intente vincularse o cobrar, el intento aparecerá aquí."
      />
    </div>
  );
}
