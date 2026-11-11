import Link from "next/link";
import { notFound } from "next/navigation";

import { AccionesDeCobro } from "@/app/(app)/suscripciones/_components/acciones-de-cobro";
import { AccionesSuscripcion } from "@/app/(app)/suscripciones/_components/acciones-suscripcion";
import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { ConfirmarPago } from "@/app/(app)/suscripciones/_components/confirmar-pago";
import { DetalleDelCobro } from "@/app/(app)/suscripciones/_components/detalle-del-cobro";
import { RegistrarPago } from "@/app/(app)/suscripciones/_components/registrar-pago";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { CHARGE_STATUS, StatusBadge, SUBSCRIPTION_SITUATION } from "@/components/domain/status-badge";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { DetailPage } from "@/components/templates/detail-page";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { AvisoDeCargo, CargoSuscripcion, Me, SubscriptionProviderSettings, SuscripcionDetalle } from "@/lib/api/types";
import { formatDateTime, formatMoney } from "@/lib/format";
import { diaEnPalabras } from "@/lib/plataforma";
import {
  actorVisible,
  avisoLabel,
  cambioProgramadoTexto,
  fraseDeLaSuscripcion,
  historialLabel,
  mesLegible,
  nombreDelCliente,
  periodicidadLabel,
  puedeAdministrar,
  resultadoDelAviso,
  situacion,
  tipoDePagoLabel,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Suscripción" };

type AvisoConPeriodo = AvisoDeCargo & { periodo: string };
type Evento = { at: string; texto: string; quien?: string };

const pendienteDePeriodo = (c: CargoSuscripcion) => c.estado === "pendiente" && c.tipo === "periodo";
const noSalio = (a: AvisoDeCargo) => a.estado_evento === "fallido" || Boolean(a.mensaje_error);

/**
 * Ficha de una suscripción (SUS-07 a 09): el cliente como título, una frase con lo que pasa, la
 * acción que lo resuelve a la vista y cancelar en «Más acciones». Los cobros van con el mes en
 * palabras y sus acciones en un menú; los avisos que no salieron, arriba y con cómo arreglarlo.
 */
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
      <div className="flex flex-col gap-6">
        <PageHeader title="Suscripción" />
        <ErrorDeCarga titulo="No pudimos cargar la suscripción" detalle={res.error} />
      </div>
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
  // SUS-09: el aviso que no salió, una vez por tipo (el más reciente).
  const fallidos = avisos.filter(noSalio).filter((a, i, todos) => todos.findIndex((b) => b.evento === a.evento) === i);

  // Pendientes primero; dentro de cada grupo, el más reciente arriba.
  const cobros = [...s.cargos].sort(
    (a, b) => Number(b.estado === "pendiente") - Number(a.estado === "pendiente") || b.periodo.localeCompare(a.periodo),
  );
  const masViejoPendiente = [...s.cargos].filter(pendienteDePeriodo).sort((a, b) => a.periodo.localeCompare(b.periodo))[0];
  const inscripcionPendiente = s.cargos.find((c) => c.estado === "pendiente" && c.tipo !== "periodo");
  const pausadaEl = s.historial.find((h) => h.accion.startsWith("subs_pausada"))?.at ?? null;

  // SUS-07: la acción principal es la que resuelve lo que pasa.
  const principal = !puedeEscribir ? null : masViejoPendiente ? (
    <RegistrarPago
      boton="accent"
      cargo={{ id: masViejoPendiente.id, periodo: masViejoPendiente.periodo, monto: masViejoPendiente.monto, moneda: s.moneda }}
      cliente={cliente}
    />
  ) : inscripcionPendiente ? (
    <ConfirmarPago
      suscripcionId={s.id}
      plan={s.plan}
      cliente={cliente}
      cargo={{ monto: inscripcionPendiente.monto, moneda: s.moneda, tipo: inscripcionPendiente.tipo }}
    />
  ) : null;

  const cobrosColumns: Column<CargoSuscripcion>[] = [
    {
      key: "cobro",
      header: "Cobro",
      cell: (c) => (
        <div className="flex flex-col items-start gap-1">
          <span className="text-headline">{mesLegible(c.periodo)}</span>
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
    {
      key: "estado",
      header: "Estado",
      cell: (c) => (
        <span className="whitespace-nowrap">
          <StatusBadge value={c.estado} map={CHARGE_STATUS} />
        </span>
      ),
    },
    { key: "cuando", header: "Cuándo", cell: (c) => <DetalleDelCobro cargo={c} /> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (c) => <div className="flex justify-end">{accionesDe(c)}</div>,
    },
  ];

  function accionesDe(c: CargoSuscripcion) {
    if (!puedeEscribir || c.estado !== "pendiente") return null;
    if (c.tipo === "periodo") {
      return (
        <AccionesDeCobro
          cargo={{ id: c.id, periodo: c.periodo, monto: c.monto, moneda: s.moneda, estado: c.estado, tipo: c.tipo }}
          cliente={cliente}
          puedeEscribir={puedeEscribir}
        />
      );
    }
    // La inscripción y el cambio de plan se confirman por la suscripción, no por el cobro de período.
    // Si «Confirmar pago» ya es la acción principal de la cabecera, la fila no la repite.
    return c.id === inscripcionPendiente?.id && !masViejoPendiente ? null : (
      <ConfirmarPago suscripcionId={s.id} plan={s.plan} cliente={cliente} cargo={{ monto: c.monto, moneda: s.moneda, tipo: c.tipo }} />
    );
  }

  const eventos: Evento[] = [
    ...avisos.map((a) => ({ at: a.creado, texto: `${avisoLabel(a.evento)} del cobro de ${mesLegible(a.periodo)}: ${resultadoDelAviso(a)}` })),
    ...s.historial.map((h) => ({
      at: h.at,
      texto: h.detalle ? `${historialLabel(h.accion)}: ${h.detalle}` : historialLabel(h.accion),
      quien: actorVisible(h.actor),
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const cambio = cambioProgramadoTexto(s.cambio_programado, s.moneda);
  const enAlerta = s.deuda > 0 || s.estado === "pausada" || s.estado === "vencida";
  const datos = [s.plan, periodicidadLabel(s.periodicidad).toLowerCase(), formatMoney(s.valor_periodo, s.moneda)];
  if (s.fecha_alta) datos.push(`cliente desde el ${diaEnPalabras(s.fecha_alta)}`);
  if (s.cliente.telefono && s.cliente.nombre) datos.push(s.cliente.telefono);

  return (
    <DetailPage
      header={{
        title: cliente,
        description: datos.join(" · "),
        actions:
          principal || puedeEscribir ? (
            <div className="flex flex-wrap items-center gap-2">
              {principal}
              <AccionesSuscripcion suscripcion={s} puedeEscribir={puedeEscribir} />
            </div>
          ) : undefined,
      }}
      summary={
        <div
          className={
            enAlerta
              ? "flex flex-wrap items-center gap-3 rounded-lg border border-status-warning-border bg-status-warning-bg p-4 text-body"
              : "flex flex-wrap items-center gap-3 rounded-lg border border-border-soft bg-surface p-4 text-body"
          }
        >
          <StatusBadge value={situacion(s)} map={SUBSCRIPTION_SITUATION} />
          <p>{fraseDeLaSuscripcion(s, pausadaEl)}</p>
        </div>
      }
    >
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      {fallidos.map((a) => (
        <p
          key={a.evento}
          role="note"
          className="rounded-lg border border-status-danger-border bg-status-danger-bg p-4 text-sm text-status-danger-fg"
        >
          {a.mensaje_error === "sin_plantilla" ? (
            <>
              El «{avisoLabel(a.evento).toLowerCase()}» no le llegó a {cliente}: falta una plantilla aprobada.{" "}
              <Link href="/plantillas" className="font-medium underline underline-offset-2">
                Cómo arreglarlo
              </Link>
            </>
          ) : (
            <>El «{avisoLabel(a.evento).toLowerCase()}» no le llegó a {cliente}: {resultadoDelAviso(a).toLowerCase()}.</>
          )}
        </p>
      ))}
      {cambio && (
        <p role="note" className="rounded-md border border-status-info-border bg-status-info-bg p-4 text-sm text-status-info-fg">
          Cambio de plan programado: {cambio}
        </p>
      )}
      <section aria-labelledby="cobros" className="flex flex-col gap-3">
        <h2 id="cobros" className="text-sh-block text-headline font-display">
          Cobros
        </h2>
        <TablaResponsiva
          etiqueta="Cobros de la suscripción"
          columns={cobrosColumns}
          rows={cobros}
          getRowKey={(c) => c.id}
          filaCelular={(c) => ({
            titulo: mesLegible(c.periodo),
            detalle: <DetalleDelCobro cargo={c} />,
            fin: formatMoney(c.monto, s.moneda),
            accion: accionesDe(c),
          })}
          emptyTitle="Sin cobros todavía"
          emptyDescription="El primer cobro se genera unos días antes de la fecha del próximo cobro."
          caption="Cobros de la suscripción"
        />
      </section>
      <details className="group rounded-lg border border-border-soft bg-surface">
        <summary className="flex cursor-pointer items-center justify-between gap-3 p-4">
          <span className="font-medium text-headline">Historial</span>
          <span className="text-sm text-text-soft">
            {eventos.length === 0
              ? "Sin avisos ni cambios todavía"
              : [
                  avisos.length > 0 && (avisos.length === 1 ? "1 aviso" : `${avisos.length} avisos`),
                  s.historial.length > 0 && (s.historial.length === 1 ? "1 cambio de estado" : `${s.historial.length} cambios de estado`),
                ]
                  .filter(Boolean)
                  .join(" y ")}
          </span>
        </summary>
        {eventos.length > 0 ? (
          <ol aria-label="Historial de la suscripción" className="border-t border-border-soft">
            {eventos.map((e, i) => (
              <li key={`${e.at}-${i}`} className="flex flex-wrap gap-x-4 gap-y-1 border-b border-border-soft px-4 py-3 text-sm last:border-b-0">
                <span className="w-40 shrink-0 tabular-nums text-text-soft">{formatDateTime(e.at)}</span>
                <span className="min-w-0 flex-1 text-body">{e.texto}</span>
                {e.quien && <span className="text-text-soft">{e.quien}</span>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="border-t border-border-soft p-4 text-sm text-text-soft">
            Aquí verás los avisos de pago que recibió el cliente y cada vez que alguien pause, reanude o cancele la suscripción.
          </p>
        )}
      </details>
    </DetailPage>
  );
}

