import { notFound } from "next/navigation";

import { StatCard } from "@/components/ui/stat-card";
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

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Clientes" value={formatNumber(c.clientes)} />
      <StatCard label="Préstamos" value={formatNumber(c.prestamos)} />
      <StatCard label="Saldo" value={formatCop(c.saldo)} />
      <StatCard label="Mora" value={formatCop(mora)} hint={mora > 0 ? "Cuotas atrasadas" : undefined} />
      <StatCard label="Cobrado (30 días)" value={formatCop(cobrado30d)} />
      <StatCard label="Gastos" value={formatCop(gastosTotal)} />
      <StatCard
        label="Caja actual"
        value={formatCop(c.caja.saldo_actual)}
        hint={c.caja.actualizado ? `Actualizada ${c.caja.actualizado}` : undefined}
      />
    </div>
  );
}
