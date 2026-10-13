import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { apiFetch } from "@/lib/api/server";
import type { QaEjecucion } from "@/lib/api/types";

import { DetalleDeInforme } from "../../_components/detalle-de-informe";

export const metadata = { title: "Informe de pruebas" };

/** Informe de una ejecución (HU-QA-03): para leer, imprimir a PDF o descargar en Markdown. */
export default async function InformePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await apiFetch<QaEjecucion>(`/admin/qa/runs/${encodeURIComponent(id)}`);
  if (!res.ok) {
    if (res.status === 404 || res.status === 422) notFound();
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el informe: {res.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <Link href="/pruebas/informes" className="inline-flex items-center gap-1 text-sm text-link print:hidden">
        <ArrowLeft aria-hidden className="h-4 w-4" /> Todos los informes
      </Link>
      <DetalleDeInforme run={res.data} />
    </div>
  );
}
