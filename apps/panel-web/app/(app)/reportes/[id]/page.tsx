import { notFound } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { FeedbackCatalogo, FeedbackReporte, Me } from "@/lib/api/types";
import { areasDelCatalogo } from "@/lib/feedback";
import { seccionLabel } from "@/lib/labels";

import { DetalleDelReporte } from "../_components/detalle-del-reporte";

export const metadata = { title: "Reporte" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIGAS = [{ label: "Cuenta" }, { label: "Mis reportes", href: "/reportes" }];

/** Detalle de un reporte (SPEC-54): la evidencia con URLs firmadas recién emitidas y, si se rechazó, el motivo. */
export default async function ReportePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [res, catalogoRes, meRes] = await Promise.all([
    apiFetch<FeedbackReporte>(`/feedback/reports/${id}`),
    apiFetch<FeedbackCatalogo>("/feedback/catalogo"),
    apiFetch<Me>("/admin/me"),
  ]);
  // Ajeno, inexistente o con los reportes apagados: la API responde 404 y aquí también.
  if (!res.ok && res.status === 404) notFound();
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Reporte" breadcrumbs={[...MIGAS, { label: "Reporte" }]} />
        <ErrorDeCarga titulo="No pudimos cargar el reporte" detalle={res.error} />
      </div>
    );
  }
  const area =
    areasDelCatalogo({ areas: catalogoRes.ok ? catalogoRes.data.areas : [] }).find((a) => a.clave === res.data.area)?.etiqueta ??
    seccionLabel(res.data.area);
  return (
    <DetalleDelReporte
      reporte={res.data}
      area={area}
      zona={meRes.ok ? (meRes.data.timezone ?? "America/Bogota") : "America/Bogota"}
      migas={MIGAS}
    />
  );
}
