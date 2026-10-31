import { notFound } from "next/navigation";

import { AccionesSuscripcion } from "@/app/(app)/suscripciones/_components/acciones-suscripcion";
import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { ConfirmarPago } from "@/app/(app)/suscripciones/_components/confirmar-pago";
import { ReenviarLink } from "@/app/(app)/suscripciones/_components/reenviar-link";
import { RegistrarPago } from "@/app/(app)/suscripciones/_components/registrar-pago";
import { CHARGE_STATUS, StatusBadge, SUBSCRIPTION_STATUS } from "@/components/domain/status-badge";
import { DetailPage } from "@/components/templates/detail-page";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { apiFetch } from "@/lib/api/server";
import type {
  AvisoDeCargo,
  CargoSuscripcion,
  HistorialSuscripcion,
  Me,
  SubscriptionProviderSettings,
  SuscripcionDetalle,
} from "@/lib/api/types";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  MOTIVO_PAUSA_LABEL,
  actorVisible,
  avisoLabel,
  cambioProgramadoTexto,
  canalDePagoExterno,
  historialLabel,
  nombreDelCliente,
  periodicidadLabel,
  puedeAdministrar,
  resultadoDelAviso,
  textoDeMora,
  tipoDePagoLabel,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Suscripción" };

type AvisoConPeriodo = AvisoDeCargo & { periodo: string };

export default async function SuscripcionDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [res, me, proveedor] = await Promise.all([
    apiFetch<SuscripcionDetalle>(`/pack/pack_subscriptions/suscripciones/${encodeURIComponent(id)}`),
    apiFetch<Me>("/admin/me"),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
  ]);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar la suscripción: {res.error}
      </p>
    );
  }
  const s = res.data;
  const puedeEscribir = me.ok && puedeAdministrar(me.data);
  const cliente = nombreDelCliente(s.cliente);

  // Qué se le avisó al cliente por sus últimos cobros (HU-SUB-05).
  const recientes = s.cargos.filter((c) => c.tipo === "periodo").slice(0, 6);
  const avisosPorCargo = await Promise.all(
    recientes.map((c) => apiFetch<AvisoDeCargo[]>(`/pack/pack_subscriptions/cargos/${c.id}/avisos`)),
  );
  const avisos: AvisoConPeriodo[] = avisosPorCargo
    .flatMap((r, i) => (r.ok ? r.data.map((a) => ({ ...a, periodo: recientes[i].periodo })) : []))
    .sort((a, b) => b.creado.localeCompare(a.creado));

  const cargosColumns: Column<CargoSuscripcion>[] = [
    {
      key: "periodo",
      header: "Período",
      cell: (c) => (
        <div className="flex flex-col items-start gap-1">
          <span className="tabular-nums text-headline">{c.periodo}</span>
          {c.tipo !== "periodo" && <Badge variant="accent">{tipoDePagoLabel(c.tipo)}</Badge>}
        </div>
      ),
    },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      cell: (c) => <span className="tabular-nums">{formatMoney(c.monto, s.moneda)}</span>,
    },
    { key: "estado", header: "Estado", cell: (c) => <StatusBadge value={c.estado} map={CHARGE_STATUS} /> },
    {
      key: "vence",
      header: "Vence",
      cell: (c) => (
        <div className="flex flex-col">
          <span className="tabular-nums">{c.fecha_vencimiento ? formatDate(c.fecha_vencimiento) : "—"}</span>
          {c.dias_mora != null && <span className="text-xs text-status-danger-fg">{textoDeMora(c.dias_mora)}</span>}
        </div>
      ),
    },
    {
      key: "pago",
      header: "Pago",
      cell: (c) => {
        const canal = canalDePagoExterno(c.pago_externo);
        return canal ? <span className="text-body">Por {canal}</span> : <span className="text-text-soft">—</span>;
      },
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => {
        if (!puedeEscribir || c.estado !== "pendiente") return null;
        if (c.tipo === "periodo") {
          return (
            <div className="flex justify-end gap-1">
              <ReenviarLink cargo={{ id: c.id, periodo: c.periodo, monto: c.monto, moneda: s.moneda }} cliente={cliente} />
              <RegistrarPago cargo={{ id: c.id, periodo: c.periodo, monto: c.monto, moneda: s.moneda }} cliente={cliente} />
            </div>
          );
        }
        // La inscripción y el cambio de plan se confirman por la suscripción, no por el cobro de período.
        return (
          <div className="flex justify-end gap-1">
            <ConfirmarPago
              suscripcionId={s.id}
              plan={s.plan}
              cliente={cliente}
              cargo={{ monto: c.monto, moneda: s.moneda, tipo: c.tipo }}
            />
          </div>
        );
      },
    },
  ];

  const avisosColumns: Column<AvisoConPeriodo>[] = [
    { key: "cuando", header: "Cuándo", cell: (a) => <span className="tabular-nums">{formatDateTime(a.creado)}</span> },
    { key: "aviso", header: "Aviso", cell: (a) => avisoLabel(a.evento) },
    { key: "cobro", header: "Cobro", cell: (a) => <span className="tabular-nums">{a.periodo}</span> },
    { key: "resultado", header: "Resultado", cell: (a) => resultadoDelAviso(a) },
  ];

  const historialColumns: Column<HistorialSuscripcion>[] = [
    { key: "cuando", header: "Cuándo", cell: (h) => <span className="tabular-nums">{formatDateTime(h.at)}</span> },
    { key: "accion", header: "Cambio", cell: (h) => historialLabel(h.accion) },
    { key: "quien", header: "Quién", cell: (h) => actorVisible(h.actor) },
    { key: "detalle", header: "Detalle", cell: (h) => h.detalle ?? "—" },
  ];

  const cambio = cambioProgramadoTexto(s.cambio_programado, s.moneda);

  return (
    <DetailPage
      header={{
        title: `${s.plan} · ${cliente}`,
        description: `Suscripción ${periodicidadLabel(s.periodicidad).toLowerCase()} de ${formatMoney(s.valor_periodo, s.moneda)}.`,
        actions: <AccionesSuscripcion suscripcion={s} puedeEscribir={puedeEscribir} />,
      }}
      summary={
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="Estado"
            value={<StatusBadge value={s.estado} map={SUBSCRIPTION_STATUS} />}
            hint={s.estado === "pausada" && s.motivo_pausa ? MOTIVO_PAUSA_LABEL[s.motivo_pausa] : undefined}
          />
          <KpiTile label="Valor del período" value={formatMoney(s.valor_periodo, s.moneda)} />
          <KpiTile
            label="Próximo cobro"
            value={s.proximo_cargo ? formatDate(s.proximo_cargo) : "—"}
            hint={s.trial_termina ? `La prueba termina el ${formatDate(s.trial_termina)}` : undefined}
          />
          <KpiTile
            label="Debe"
            value={s.deuda ? formatMoney(s.deuda, s.moneda) : "—"}
            tone={s.en_mora > 0 ? "danger" : "default"}
            hint={s.en_mora > 0 ? textoDeMora(s.dias_mora) : undefined}
          />
        </div>
      }
    >
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      {cambio && (
        <p role="note" className="rounded-md border border-status-info-border bg-status-info-bg p-4 text-sm text-status-info-fg">
          Cambio de plan programado: {cambio}
        </p>
      )}
      <section aria-labelledby="cobros" className="flex flex-col gap-3">
        <h2 id="cobros" className="text-sh-block text-headline font-display">
          Cobros
        </h2>
        <DataTable
          columns={cargosColumns}
          rows={s.cargos}
          getRowKey={(c) => c.id}
          emptyTitle="Sin cobros todavía"
          emptyDescription="El primer cobro se genera unos días antes de la fecha del próximo cobro."
          caption="Cobros de la suscripción"
        />
      </section>
      <section aria-labelledby="avisos" className="flex flex-col gap-3">
        <h2 id="avisos" className="text-sh-block text-headline font-display">
          Avisos enviados al cliente
        </h2>
        <DataTable
          columns={avisosColumns}
          rows={avisos}
          getRowKey={(a) => `${a.periodo}-${a.evento}-${a.creado}`}
          emptyTitle="Sin avisos"
          emptyDescription="Aquí verás los avisos y recordatorios de pago que recibió el cliente."
          caption="Avisos enviados"
        />
      </section>
      <section aria-labelledby="historial" className="flex flex-col gap-3">
        <h2 id="historial" className="text-sh-block text-headline font-display">
          Cambios de estado
        </h2>
        <DataTable
          columns={historialColumns}
          rows={s.historial}
          getRowKey={(h) => `${h.at}-${h.accion}`}
          emptyTitle="Sin cambios registrados"
          emptyDescription="Cada vez que alguien pause, reanude o cancele esta suscripción, quedará anotado aquí."
          caption="Historial de cambios"
        />
      </section>
    </DetailPage>
  );
}
