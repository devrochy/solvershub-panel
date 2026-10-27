import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { CashAdjustDialog } from "../_components/cash-actions";
import { FichaTabs } from "../_components/ficha-tabs";
import { PortfolioConfigDialog } from "../_components/portfolio-config-dialog";
import { cargarCartera } from "../_lib/cartera";

/**
 * Ficha de la cartera: encabezado y pestañas por ruta (Resumen, Clientes, Caja, Ruta del día,
 * Notas). La ficha de un cliente cuelga de la cartera pero tiene su propio encabezado, por
 * eso vive fuera de este grupo de rutas.
 */
export default async function FichaDeCarteraLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [res, configRes] = await Promise.all([
    cargarCartera(id),
    apiFetch<{ values: Record<string, unknown> }>(`/pack/cobranza/portfolios/${id}/config`),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar la cartera: {res.error}
      </p>
    );
  }
  const c = res.data;
  const configValues = configRes.ok ? configRes.data.values : {};

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={c.nombre}
        description={c.descripcion ?? `Cartera en ${c.moneda} · ${c.num_cuotas} cuotas · interés ${c.tipo_interes}%`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <CashAdjustDialog
              portfolioId={c.id}
              saldoActual={c.caja.saldo_actual}
              trigger={<Button variant="accent">Ajustar caja</Button>}
            />
            <PortfolioConfigDialog
              portfolioId={c.id}
              values={configValues}
              trigger={<Button variant="outline">Configuración</Button>}
            />
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={c.estatus === "activa" ? "success" : "neutral"}>{c.estatus}</Badge>
        <span className="text-[13px] text-body">Gestor: {c.gestor ?? "—"}</span>
      </div>

      <FichaTabs carteraId={c.id} />

      {children}
    </div>
  );
}
