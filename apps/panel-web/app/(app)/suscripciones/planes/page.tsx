import { AccionesDePlan } from "@/app/(app)/suscripciones/planes/_components/acciones-de-plan";
import { EditorDePlan, PlanDialog } from "@/app/(app)/suscripciones/planes/_components/plan-dialog";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { StatusBadge } from "@/components/domain/status-badge";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { ListPage } from "@/components/templates/list-page";
import type { Column } from "@/components/ui/data-table";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import type { Me, MinimoPagoEnLineaOut, PlanOut } from "@/lib/api/types";
import { PLAN_ESTADO, estadoDelPlan, precioEnPalabras, textoDePrueba } from "@/lib/planes";
import { puedeAdministrar } from "@/lib/suscripciones-admin";

export const metadata = { title: "Planes" };

/**
 * Planes (SUS-10): cada fila dice qué incluye, cuánto y cada cuánto; la fila abre su editor
 * (`?plan=`) y dejar de ofrecer o eliminar van en «Más acciones». Sin código a la vista.
 */
export default async function PlanesPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const sp = await searchParams;
  const [res, me, minimoRes, moneda] = await Promise.all([
    apiFetch<PlanOut[]>("/pack/pack_subscriptions/planes?incluir_inactivos=true"),
    apiFetch<Me>("/admin/me"),
    // HU-SUB-25: si no se pudo saber el mínimo, el diálogo no avisa (mejor callar que inventar una cifra).
    apiFetch<MinimoPagoEnLineaOut>("/pack/commerce/pago-en-linea/minimo"),
    getBusinessCurrency(),
  ]);
  const puedeEscribir = me.ok && puedeAdministrar(me.data);
  const minimo = minimoRes.ok ? minimoRes.data : null;
  const header = {
    title: "Planes",
    helpSection: "subscriptions",
    actions: puedeEscribir ? <PlanDialog minimo={minimo} moneda={moneda} /> : undefined,
  };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No pudimos cargar los planes" detalle={res.error} />
      </ListPage>
    );
  }
  const planes = res.data;
  const elegido = puedeEscribir && sp.plan ? planes.find((p) => p.id === sp.plan) : undefined;
  const editarHref = (p: PlanOut) => `/suscripciones/planes?plan=${p.id}`;

  const columns: Column<PlanOut>[] = [
    {
      key: "plan",
      header: "Plan",
      cell: (p) => (
        <div className="flex min-w-0 flex-col">
          <span className="font-medium text-headline">{p.nombre}</span>
          {p.descripcion && <span className="text-xs text-text-soft">{p.descripcion}</span>}
        </div>
      ),
    },
    { key: "precio", header: "Precio", cell: (p) => <span className="whitespace-nowrap tabular-nums">{precioEnPalabras(p)}</span> },
    { key: "prueba", header: "Prueba", cell: (p) => textoDePrueba(p) },
    {
      key: "estado",
      header: "Estado",
      cell: (p) => (
        <span className="whitespace-nowrap">
          <StatusBadge value={estadoDelPlan(p)} map={PLAN_ESTADO} />
        </span>
      ),
    },
    ...(puedeEscribir
      ? [
          {
            key: "acciones",
            header: <span className="sr-only">Acciones</span>,
            align: "right" as const,
            cell: (p: PlanOut) => (
              <div className="relative z-10 flex justify-end">
                <AccionesDePlan plan={p} />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <ListPage header={header}>
      <TablaResponsiva
        etiqueta="Planes de suscripción"
        columns={columns}
        rows={planes}
        getRowKey={(p) => p.id}
        getRowHref={puedeEscribir ? editarHref : undefined}
        getRowLabel={(p) => `Editar ${p.nombre}`}
        scrollAlAbrir={false}
        filaCelular={(p) => ({
          titulo: p.nombre,
          detalle: `${precioEnPalabras(p)} · ${p.trial_dias > 0 ? `${textoDePrueba(p)} de prueba` : "sin prueba"}${p.activo ? "" : " · no se ofrece"}`,
          accion: puedeEscribir ? <AccionesDePlan plan={p} /> : undefined,
          href: puedeEscribir ? editarHref(p) : undefined,
        })}
        emptyTitle="Todavía no tienes planes"
        emptyDescription={
          puedeEscribir
            ? "Crea el primero para que el agente pueda inscribir clientes."
            : "Quien administra el negocio puede crear el primero."
        }
        emptyAction={puedeEscribir ? <PlanDialog minimo={minimo} moneda={moneda} /> : undefined}
        caption="Planes de suscripción"
      />
      {elegido && <EditorDePlan plan={elegido} minimo={minimo} moneda={moneda} />}
    </ListPage>
  );
}
