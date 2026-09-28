import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Cobranza" };

type Summary = { kpis: { label: string; value: string }[] };
type Collector = { id: string; nombre: string; correo: string | null; telefono: string | null; estatus: string };

export default async function CobranzaPage() {
  const [summaryRes, collectorsRes] = await Promise.all([
    apiFetch<Summary>("/pack/cobranza/summary"),
    apiFetch<Collector[]>("/pack/cobranza/collectors"),
  ]);
  if (!summaryRes.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar Cobranza: {summaryRes.error}
      </p>
    );
  }
  const collectors = collectorsRes.ok ? collectorsRes.data : [];

  const columns: Column<Collector>[] = [
    { key: "nombre", header: "Gestor", cell: (g) => <span className="text-headline">{g.nombre}</span> },
    { key: "correo", header: "Correo", cell: (g) => <span className="text-body">{g.correo ?? "—"}</span> },
    { key: "telefono", header: "Teléfono", cell: (g) => <span className="text-body">{g.telefono ?? "—"}</span> },
    {
      key: "estatus",
      header: "Estado",
      cell: (g) => <Badge variant={g.estatus === "activo" ? "success" : "neutral"}>{g.estatus}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cobranza"
        description="Resumen operativo y gestores (habilidad Cobranza)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/carteras">Carteras</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/cobros">Cobros</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/promesas">Promesas</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/cobranza/reglas">Reglas</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/legacy/cobranza">Cobranza clásica ↗</Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryRes.data.kpis.map((kpi) => (
          <StatCard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold text-headline">Gestores</h2>
        <DataTable
          columns={columns}
          rows={collectors}
          getRowKey={(g) => g.id}
          emptyTitle="Sin gestores"
          emptyDescription="Los gestores de campo se crean en el panel clásico."
        />
      </section>
    </div>
  );
}
