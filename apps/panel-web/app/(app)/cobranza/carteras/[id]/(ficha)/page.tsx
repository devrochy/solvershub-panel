import { notFound } from "next/navigation";

import { KpiTile } from "@/components/ui/kpi-tile";
import { fechaHoraDeApi } from "@/lib/cobranza/presentacion";
import { formatCop, formatNumber } from "@/lib/format";
import { cargarCartera } from "../_lib/cartera";

export const metadata = { title: "Detalle de cartera" };

export default async function CarteraResumenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await cargarCartera(id);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return null; // el layout ya muestra el error
  }
  const c = res.data;
  // Tolerante a una API vieja (despliegue desfasado): sin campos nuevos no rompe.
  const mora = c.mora ?? 0;
  const cobrado30d = c.cobrado_30d ?? 0;
  const gastosTotal = c.gastos_total ?? 0;
  const base = `/cobranza/carteras/${c.id}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        <KpiTile label="Saldo" value={formatCop(c.saldo)} hint={`${formatNumber(c.prestamos)} préstamos`} size="hero" />
        <KpiTile
          label="Mora"
          value={formatCop(mora)}
          hint={mora > 0 ? "Cuotas atrasadas" : undefined}
          tone={mora > 0 ? "danger" : "default"}
          size="hero"
        />
        <KpiTile label="Cobrado, 30 días" value={formatCop(cobrado30d)} size="hero" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiTile label="Clientes" value={formatNumber(c.clientes)} size="compact" href={`${base}/clientes`} />
        <KpiTile
          label="Caja actual"
          value={formatCop(c.caja.saldo_actual)}
          hint={c.caja.actualizado ? `Actualizada ${fechaHoraDeApi(c.caja.actualizado)}` : undefined}
          size="compact"
          href={`${base}/caja`}
        />
        <KpiTile label="Gastos" value={formatCop(gastosTotal)} size="compact" href={`${base}/caja`} />
      </div>
    </div>
  );
}
