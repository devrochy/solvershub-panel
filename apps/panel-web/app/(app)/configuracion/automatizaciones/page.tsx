import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { EstadoDeError } from "@/components/ui/estado-de-error";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { AutomatizacionesResponse, Me } from "@/lib/api/types";

import { ListaAutomatizaciones } from "./_components/lista";

export const metadata = { title: "Automatizaciones" };

/**
 * Configuración → Automatizaciones (ADR-0200): los crons de negocio de los packs habilitados.
 * El dueño y el master escriben; el colaborador lee y el dueño puede darle `write` en
 * Colaboradores. Los crons de plataforma siguen en `Plataforma › Crons` (solo master).
 */
export default async function AutomatizacionesPage() {
  const [res, meRes] = await Promise.all([
    apiFetch<AutomatizacionesResponse>("/admin/automatizaciones"),
    apiFetch<Me>("/admin/me"),
  ]);
  const header = (
    <PageHeader
      title="Automatizaciones"
      description="Lo que el asistente hace solo, a qué hora y dentro de qué ventana."
      helpSection="settings"
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        {res.status === 403 ? (
          <div className="rounded-lg border border-border-soft bg-surface">
            <EstadoDeError
              titulo="No tienes acceso a las automatizaciones"
              descripcion="Pídele acceso a quien administra el negocio."
            />
          </div>
        ) : (
          <ErrorDeCarga titulo="No pudimos cargar las automatizaciones" detalle={res.error} />
        )}
      </div>
    );
  }
  const puedeEditar =
    meRes.ok && (meRes.data.role === "master" || meRes.data.permissions?.automatizaciones === "write");
  return (
    <div className="flex flex-col gap-6">
      {header}
      <ListaAutomatizaciones items={res.data.items} resumen={res.data.resumen} puedeEditar={puedeEditar} />
    </div>
  );
}
