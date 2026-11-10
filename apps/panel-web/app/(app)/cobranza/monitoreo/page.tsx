import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { ListPage } from "@/components/templates/list-page";
import { KpiTile } from "@/components/ui/kpi-tile";
import { apiFetch } from "@/lib/api/server";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Actividad del agente" };

type Monitoring = {
  conversaciones: number;
  escalaciones: number;
  promesas_pendientes: number;
  promesas_cumplidas: number;
  promesas_incumplidas: number;
};

export default async function MonitoreoPage() {
  const res = await apiFetch<Monitoring>("/pack/cobranza/monitoring");
  const header = { title: "Actividad del agente", description: "Lo que atendió el agente y cómo van las promesas de pago." };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No se pudo cargar la actividad del agente" detalle={res.error} />
      </ListPage>
    );
  }
  const m = res.data;

  return (
    <ListPage header={header}>
      <section aria-label="Conversaciones" className="grid gap-4 sm:grid-cols-2">
        <KpiTile label="Conversaciones" value={formatNumber(m.conversaciones)} href="/conversaciones" />
        <KpiTile
          label="Escalaciones"
          value={formatNumber(m.escalaciones)}
          tone={m.escalaciones > 0 ? "warning" : "default"}
          href="/escalaciones?estado=pendiente"
        />
      </section>
      <section aria-labelledby="promesas" className="flex flex-col gap-3">
        <h2 id="promesas" className="font-display text-sh-block text-headline">
          Promesas de pago
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiTile label="Pendientes" value={formatNumber(m.promesas_pendientes)} href="/cobranza/promesas" />
          <KpiTile label="Cumplidas" value={formatNumber(m.promesas_cumplidas)} tone="success" href="/cobranza/promesas?estado=cumplida" />
          <KpiTile
            label="Incumplidas"
            value={formatNumber(m.promesas_incumplidas)}
            tone={m.promesas_incumplidas > 0 ? "danger" : "default"}
            href="/cobranza/promesas?estado=incumplida"
          />
        </div>
      </section>
    </ListPage>
  );
}
