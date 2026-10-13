import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api/server";
import type { QaEjecucion } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import { porcentaje, segmentosDeProgreso } from "@/lib/qa/estados";

export const metadata = { title: "Informes de pruebas" };

const COLUMNAS: Column<QaEjecucion>[] = [
  {
    key: "tester",
    header: "Tester",
    cell: (r) => (
      <Link href={`/pruebas/informes/${r.id}`} className="font-medium text-link underline-offset-2 hover:underline">
        {r.tester.nombre || r.tester.email}
      </Link>
    ),
  },
  { key: "ciclo", header: "Ciclo", cell: (r) => r.ciclo_nombre },
  {
    key: "estado",
    header: "Estado",
    cell: (r) => (r.estado === "enviada" ? <Badge variant="success">Enviado</Badge> : <Badge variant="info">En curso</Badge>),
  },
  {
    key: "avance",
    header: "Avance",
    cell: (r) => (
      <div className="flex min-w-40 items-center gap-2">
        <Progress
          size="sm"
          label={`Avance de ${r.tester.nombre || r.tester.email}`}
          value={r.progreso.terminadas}
          max={r.progreso.total || 1}
          segments={segmentosDeProgreso(r.progreso).map((s) => ({ key: s.clave, value: s.valor, label: s.label, tone: s.tono }))}
        />
        <span className="shrink-0 text-xs tabular-nums text-body">{porcentaje(r.progreso.terminadas, r.progreso.total)} %</span>
      </div>
    ),
  },
  {
    key: "fallas",
    header: "Fallas",
    align: "right",
    cell: (r) => <span className="tabular-nums">{r.progreso.falla + r.progreso.bloqueada}</span>,
  },
  { key: "enviado", header: "Enviado", cell: (r) => (r.enviada_en ? formatDateTime(r.enviada_en) : "—") },
];

/** Pruebas › Informes (HU-QA-03): el master ve las ejecuciones de todos; un tester, las suyas. */
export default async function InformesPage() {
  const res = await apiFetch<QaEjecucion[]>("/admin/qa/runs");
  return (
    <DataTable
      caption="Ejecuciones e informes de pruebas"
      columns={COLUMNAS}
      rows={res.ok ? res.data : []}
      getRowKey={(r) => r.id}
      error={res.ok ? null : res.error}
      emptyTitle="Todavía no hay ejecuciones"
      emptyDescription="Cuando alguien empiece a probar en Ejecutar, su avance y su informe aparecen aquí."
    />
  );
}
