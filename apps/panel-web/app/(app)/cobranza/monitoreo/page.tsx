import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Monitoreo IA" };

type Monitoring = {
  conversaciones: number;
  escalaciones: number;
  promesas_pendientes: number;
  promesas_cumplidas: number;
  promesas_incumplidas: number;
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Monitoreo IA"
        description="Actividad del agente y estado de las promesas de pago."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/cobranza/promesas">Ver promesas</Link>
          </Button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Conversaciones" value={m.conversaciones} />
        <StatCard label="Escalaciones" value={m.escalaciones} tone={m.escalaciones > 0 ? "warning" : "default"} />
        <StatCard label="Promesas pendientes" value={m.promesas_pendientes} />
        <StatCard label="Promesas cumplidas" value={m.promesas_cumplidas} tone="success" />
        <StatCard label="Promesas incumplidas" value={m.promesas_incumplidas} tone={m.promesas_incumplidas > 0 ? "danger" : "default"} />
      </div>
    </div>
  );
}
