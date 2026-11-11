import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { apiFetch } from "@/lib/api/server";
import type { QaCiclo, QaEjecucion } from "@/lib/api/types";
import { fechaEnPalabras, porcentaje, segmentosDeProgreso } from "@/lib/qa/estados";

export const metadata = { title: "Informes de pruebas" };

const nombreDe = (r: QaEjecucion) => r.tester.nombre || r.tester.email;
const fallasDe = (r: QaEjecucion) => r.progreso.falla + r.progreso.bloqueada;

function Estado({ run }: { run: QaEjecucion }) {
  return run.estado === "enviada" ? <Badge variant="success">Enviado</Badge> : <Badge variant="info">En curso</Badge>;
}

const COLUMNAS: Column<QaEjecucion>[] = [
  { key: "tester", header: "Tester", cell: (r) => <span className="font-medium text-headline">{nombreDe(r)}</span> },
  { key: "estado", header: "Estado", cell: (r) => <Estado run={r} /> },
  {
    key: "avance",
    header: "Avance",
    cell: (r) => (
      <div className="flex min-w-40 items-center gap-2">
        <Progress
          size="sm"
          label={`Avance de ${nombreDe(r)}`}
          value={r.progreso.terminadas}
          max={r.progreso.total || 1}
          segments={segmentosDeProgreso(r.progreso).map((s) => ({ key: s.clave, value: s.valor, label: s.label, tone: s.tono }))}
        />
        <span className="shrink-0 text-xs tabular-nums text-body">{porcentaje(r.progreso.terminadas, r.progreso.total)} %</span>
      </div>
    ),
  },
  { key: "fallas", header: "Con falla o bloqueo", align: "right", cell: (r) => <span className="tabular-nums">{fallasDe(r)}</span> },
  { key: "enviado", header: "Enviado", cell: (r) => (r.enviada_en ? `el ${fechaEnPalabras(r.enviada_en)}` : "—") },
];

/**
 * Pruebas › Informes (HU-QA-03, PRU-08): el master ve las ejecuciones de todos; un tester, las
 * suyas. Van por ciclo, el abierto primero, y cada fila abre su informe.
 */
export default async function InformesPage() {
  const [res, ciclos] = await Promise.all([apiFetch<QaEjecucion[]>("/admin/qa/runs"), apiFetch<QaCiclo[]>("/admin/qa/cycles")]);
  if (!res.ok) return <ErrorDeCarga titulo="No pudimos cargar los informes" detalle={res.error} />;
  if (res.data.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay informes"
        description="Cuando alguien empiece a probar en Ejecutar, su avance y su informe aparecen aquí."
      />
    );
  }
  // El orden de los ciclos lo da la API (el abierto primero); un ciclo que no viene va al final.
  const orden = ciclos.ok ? ciclos.data.map((c) => c.id) : [];
  const abiertos = new Set(ciclos.ok ? ciclos.data.filter((c) => c.abierto).map((c) => c.id) : []);
  const grupos = new Map<string, { nombre: string; runs: QaEjecucion[] }>();
  for (const run of res.data) {
    const g = grupos.get(run.cycle_id) ?? { nombre: run.ciclo_nombre, runs: [] };
    g.runs.push(run);
    grupos.set(run.cycle_id, g);
  }
  const ids = [...grupos.keys()].sort((a, b) => (orden.indexOf(a) + 1 || 999) - (orden.indexOf(b) + 1 || 999));

  return (
    <div className="flex flex-col gap-6">
      {ids.map((id) => {
        const { nombre, runs } = grupos.get(id)!;
        return (
          <section key={id} aria-labelledby={`ciclo-${id}`} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={`ciclo-${id}`} className="font-display text-sh-block text-headline">
                {nombre}
              </h2>
              {abiertos.has(id) ? <Badge variant="info">Abierto</Badge> : <Badge>Cerrado</Badge>}
            </div>
            <TablaResponsiva
              etiqueta={`Informes de ${nombre}`}
              caption={`Informes de ${nombre}`}
              columns={COLUMNAS}
              rows={runs}
              getRowKey={(r) => r.id}
              getRowHref={(r) => `/pruebas/informes/${r.id}`}
              getRowLabel={(r) => `Abrir el informe de ${nombreDe(r)}`}
              filaCelular={(r) => ({
                titulo: nombreDe(r),
                detalle: `${r.progreso.terminadas} de ${r.progreso.total} terminadas${fallasDe(r) > 0 ? ` · ${fallasDe(r)} con falla o bloqueo` : ""}`,
                fin: <Estado run={r} />,
                href: `/pruebas/informes/${r.id}`,
              })}
            />
          </section>
        );
      })}
    </div>
  );
}
