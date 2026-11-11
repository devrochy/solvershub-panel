import Link from "next/link";

import { AvisoDeAlcance } from "@/app/(app)/suscripciones/_components/aviso-de-alcance";
import { ConfirmarPago } from "@/app/(app)/suscripciones/_components/confirmar-pago";
import { FiltrosSuscripciones } from "@/app/(app)/suscripciones/_components/filtros";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { StatusBadge, SUBSCRIPTION_SITUATION } from "@/components/domain/status-badge";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { ListPage } from "@/components/templates/list-page";
import type { Column } from "@/components/ui/data-table";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type {
  CargosSuscripcionPage,
  Me,
  PlanOut,
  SubscriptionProviderSettings,
  SuscripcionItem,
  SuscripcionesPage,
} from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import {
  conQuery,
  consultaSuscripciones,
  enlaceDePagina,
  lineaDeSuscripcion,
  montosDeInscripcion,
  nombreDelCliente,
  opcionesDePlanes,
  periodicidadLabel,
  puedeAdministrar,
  situacion,
  type FiltrosSuscripciones as Filtros,
} from "@/lib/suscripciones-admin";

export const metadata = { title: "Suscripciones" };

const cabecera = { title: "Suscripciones", helpSection: "subscriptions" };

/**
 * Lista de suscripciones (SUS-05, SUS-06): filtra al tocar, la fila abre la suscripción, el estado
 * dice una sola cosa y la línea de la derecha dice lo que debe o qué sigue. En el celular, filas.
 */
export default async function SuscripcionesListaPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const sp = await searchParams;
  const qs = consultaSuscripciones(sp);
  const [res, planes, proveedor, me] = await Promise.all([
    apiFetch<SuscripcionesPage>(`/pack/pack_subscriptions/suscripciones${conQuery(qs)}`),
    // SPEC-43: las opciones del filtro «Plan» salen del catálogo de planes, no de los productos.
    apiFetch<PlanOut[]>("/pack/pack_subscriptions/planes?incluir_inactivos=true"),
    apiFetch<SubscriptionProviderSettings>("/admin/settings/subscription-provider"),
    apiFetch<Me>("/admin/me"),
  ]);
  const filtros = <FiltrosSuscripciones planes={planes.ok ? opcionesDePlanes(planes.data) : []} />;
  if (!res.ok) {
    return (
      <ListPage header={cabecera} filters={filtros}>
        <ErrorDeCarga titulo="No pudimos cargar las suscripciones" detalle={res.error} />
      </ListPage>
    );
  }
  const { items, page, has_more, total } = res.data;
  const puedeEscribir = me.ok && puedeAdministrar(me.data);
  // El cargo de la inscripción no cuenta en «Debe» (solo cobros de período): se busca aparte, y solo
  // si hay inscripciones esperando pago en esta página.
  const hayPendientes = items.some((s) => s.estado === "pendiente_pago");
  const cargosDeInscripcion = hayPendientes
    ? await apiFetch<CargosSuscripcionPage>(
        "/pack/pack_subscriptions/cargos?tipo=inscripcion&estado=pendiente&page_size=100",
      )
    : null;
  const montos = montosDeInscripcion(cargosDeInscripcion?.ok ? cargosDeInscripcion.data.items : []);
  const linea = (s: SuscripcionItem) => lineaDeSuscripcion(s, montos.get(s.id));
  const confirmar = (s: SuscripcionItem) =>
    puedeEscribir && s.estado === "pendiente_pago" ? (
      <ConfirmarPago
        suscripcionId={s.id}
        plan={s.plan}
        cliente={nombreDelCliente(s.cliente)}
        cargo={{ monto: montos.get(s.id) ?? s.valor_periodo, moneda: s.moneda, tipo: "inscripcion" }}
      />
    ) : null;

  const columns: Column<SuscripcionItem>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (s) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-headline">{nombreDelCliente(s.cliente)}</span>
          {s.cliente.telefono && s.cliente.nombre && (
            <span className="truncate text-xs text-text-soft">{s.cliente.telefono}</span>
          )}
        </div>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      cell: (s) => (
        <div className="flex flex-col">
          <span className="text-headline">{s.plan}</span>
          <span className="text-xs text-text-soft">
            {periodicidadLabel(s.periodicidad)} · {formatMoney(s.valor_periodo, s.moneda)}
          </span>
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (s) => (
        <span className="whitespace-nowrap">
          <StatusBadge value={situacion(s)} map={SUBSCRIPTION_SITUATION} />
        </span>
      ),
    },
    {
      key: "sigue",
      header: "Qué sigue",
      cell: (s) => <span className={s.en_mora > 0 ? "text-status-danger-fg" : "text-body"}>{linea(s)}</span>,
    },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      cell: (s) => <div className="relative z-10 flex justify-end">{confirmar(s)}</div>,
    },
  ];

  const deUnCliente = sp.cliente_id ? items[0]?.cliente : undefined;

  return (
    <ListPage header={cabecera} filters={filtros}>
      <AvisoDeAlcance proveedor={proveedor.ok ? proveedor.data : null} />
      {sp.cliente_id && (
        <p className="text-sm text-body">
          Solo las suscripciones de {deUnCliente ? nombreDelCliente(deUnCliente) : "un cliente"}.{" "}
          <Link href="/suscripciones/lista" className="text-link hover:underline">
            Ver todas
          </Link>
        </p>
      )}
      <TablaResponsiva
        etiqueta="Suscripciones"
        columns={columns}
        rows={items}
        getRowKey={(s) => s.id}
        getRowHref={(s) => `/suscripciones/lista/${s.id}`}
        getRowLabel={(s) => `Abrir la suscripción de ${nombreDelCliente(s.cliente)}`}
        filaCelular={(s) => ({
          titulo: nombreDelCliente(s.cliente),
          detalle: (
            <span className={s.en_mora > 0 ? "text-status-danger-fg" : undefined}>
              {s.plan} · {linea(s)}
            </span>
          ),
          // Con «Confirmar pago» a la derecha no cabe también el estado: la línea ya dice qué espera.
          fin: confirmar(s) ? undefined : <StatusBadge value={situacion(s)} map={SUBSCRIPTION_SITUATION} />,
          accion: confirmar(s),
          href: `/suscripciones/lista/${s.id}`,
        })}
        emptyTitle="Sin suscripciones"
        emptyDescription="Cuando un cliente se inscriba a un plan, su suscripción aparecerá aquí."
        caption="Suscripciones"
        serverPaginated
      />
      <Pagination
        page={page}
        hasMore={has_more}
        total={total}
        label="suscripciones"
        makeHref={(target) => enlaceDePagina("/suscripciones/lista", qs, target)}
      />
    </ListPage>
  );
}
