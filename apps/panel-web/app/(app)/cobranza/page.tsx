import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Cobranza" };

type Summary = { kpis: { label: string; value: string }[] };

export default async function CobranzaPage() {
  const summaryRes = await apiFetch<Summary>("/pack/cobranza/summary");
  if (!summaryRes.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar Cobranza: {summaryRes.error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cobranza"
        description="Resumen operativo (habilidad Cobranza)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/carteras">Carteras</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/cobros">Cobros al propietario</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/pagos">Pagos</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/dispositivos">Dispositivos</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/reportes">Reportes</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/propietario">Propietario</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/promesas">Promesas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/reglas">Reglas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/monitoreo">Monitoreo IA</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/alertas">Alertas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/auditoria">Auditoría</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryRes.data.kpis.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>
    </div>
  );
}
