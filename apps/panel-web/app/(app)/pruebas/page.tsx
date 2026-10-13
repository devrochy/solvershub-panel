import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch } from "@/lib/api/server";
import type { QaCatalogo, QaEjecucion } from "@/lib/api/types";

import { EjecucionDePruebas } from "./_components/ejecucion";

/**
 * Pruebas › Ejecutar (HU-QA-03): lista de pruebas a la izquierda y la ejecución paso a paso a
 * la derecha, con el avance propio y el del ciclo arriba.
 */
export default async function EjecutarPruebasPage() {
  const [catalogo, run, guia] = await Promise.all([
    apiFetch<QaCatalogo>("/admin/qa/catalog?seccion=pruebas"),
    apiFetch<QaEjecucion | null>("/admin/qa/runs/me"),
    apiFetch<QaCatalogo>("/admin/qa/catalog?seccion=datos"),
  ]);
  if (!catalogo.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el catálogo de pruebas: {catalogo.error}
      </p>
    );
  }
  if (!catalogo.data.ciclo) {
    return (
      <EmptyState
        title="Todavía no hay catálogo de pruebas"
        description="El catálogo se versiona en solvershub-docs (11-pruebas/catalogo.yaml). Un admin de plataforma lo importa con «agent-core qa importar» y se abre el primer ciclo."
      />
    );
  }
  const titulos = Object.fromEntries((guia.ok ? guia.data.items : []).map((i) => [i.slug, i.titulo]));
  return <EjecucionDePruebas catalogo={catalogo.data} inicial={run.ok ? run.data : null} guia={titulos} />;
}
