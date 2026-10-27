import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Cobranza" };

type Summary = { kpis: { label: string; value: string }[] };

export default async function CobranzaPage() {
  const summaryRes = await apiFetch<Summary>("/pack/cobranza/summary");
  if (!summaryRes.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar Cobranza: {summaryRes.error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cobranza"
        description="Resumen operativo de la cobranza."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryRes.data.kpis.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>
    </div>
  );
}
