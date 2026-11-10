import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { StatusBadge } from "@/components/domain/status-badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { CARTERA_STATUS } from "@/lib/cobranza/presentacion";
import { CashAdjustDialog } from "../_components/cash-actions";
import { FichaTabs } from "../_components/ficha-tabs";
import { PortfolioConfigDialog } from "../_components/portfolio-config-dialog";
import { cargarCartera } from "../_lib/cartera";

/**
 * Ficha de la cartera: encabezado y pestañas por ruta (Resumen, Clientes, Caja, Ruta del día,
 * Notas), que reemplazan a las áreas de Cobranza: las migas llevan de vuelta. La ficha de un
 * cliente cuelga de la cartera pero tiene su propio encabezado, por eso vive fuera de este
 * grupo de rutas.
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
      <div className="flex flex-col gap-6">
        <PageHeader title="Cartera" tabs={false} />
        <ErrorDeCarga titulo="No se pudo cargar la cartera" detalle={res.error} />
      </div>
    );
  }
  const c = res.data;
  const configValues = configRes.ok ? configRes.data.values : {};
  const condiciones = [
    c.descripcion,
    `Gestor: ${c.gestor ?? "sin asignar"}`,
    `${c.num_cuotas} cuotas`,
    `interés ${c.tipo_interes} %`,
    c.moneda !== "COP" ? c.moneda : null,
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={c.nombre}
        despuesDelTitulo={<StatusBadge value={c.estatus} map={CARTERA_STATUS} />}
        description={condiciones.filter(Boolean).join(" · ")}
        tabs={<FichaTabs carteraId={c.id} />}
        actions={
          <>
            <PortfolioConfigDialog
              portfolioId={c.id}
              values={configValues}
              trigger={<Button variant="outline">Configuración</Button>}
            />
            <CashAdjustDialog
              portfolioId={c.id}
              saldoActual={c.caja.saldo_actual}
              trigger={<Button variant="accent">Ajustar caja</Button>}
            />
          </>
        }
      />

      {children}
    </div>
  );
}
