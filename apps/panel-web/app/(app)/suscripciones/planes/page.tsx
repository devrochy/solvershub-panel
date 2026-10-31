import { AccionesDePlan } from "@/app/(app)/suscripciones/planes/_components/acciones-de-plan";
import { PlanDialog } from "@/app/(app)/suscripciones/planes/_components/plan-dialog";
import { StatusBadge } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { apiFetch, getBusinessCurrency } from "@/lib/api/server";
import type { Me, MinimoPagoEnLineaOut, PlanOut } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";
import { PLAN_ESTADO, estadoDelPlan, textoDePrueba } from "@/lib/planes";
import { periodicidadLabel, puedeAdministrar } from "@/lib/suscripciones-admin";

export const metadata = { title: "Planes" };

export default async function PlanesPage() {
  const [res, me, minimoRes, moneda] = await Promise.all([
    apiFetch<PlanOut[]>("/pack/pack_subscriptions/planes?incluir_inactivos=true"),
    apiFetch<Me>("/admin/me"),
    // HU-SUB-25: si no se pudo saber el mínimo, el diálogo no avisa (mejor callar que inventar una cifra).
    apiFetch<MinimoPagoEnLineaOut>("/pack/commerce/pago-en-linea/minimo"),
    getBusinessCurrency(),
  ]);
  const puedeEscribir = me.ok && puedeAdministrar(me.data);
  const minimo = minimoRes.ok ? minimoRes.data : null;
  const planes = res.ok ? res.data : [];

  const columns: Column<PlanOut>[] = [
    {
      key: "plan",
      header: "Plan",
      cell: (p) => (
        <div className="flex min-w-0 flex-col">
          <span className="text-headline">{p.nombre}</span>
          <span className="font-mono text-xs text-text-soft">{p.codigo}</span>
          {p.descripcion && <span className="text-xs text-text-soft">{p.descripcion}</span>}
        </div>
      ),
    },
    {
      key: "precio",
      header: "Precio",
      align: "right",
      cell: (p) => (
        <span className="tabular-nums">{p.precio > 0 ? formatMoney(p.precio, p.moneda) : <Badge variant="accent">Gratis</Badge>}</span>
      ),
    },
    { key: "periodicidad", header: "Periodicidad", cell: (p) => periodicidadLabel(p.periodicidad) },
    { key: "prueba", header: "Prueba", cell: (p) => textoDePrueba(p) },
    { key: "estado", header: "Estado", cell: (p) => <StatusBadge value={estadoDelPlan(p)} map={PLAN_ESTADO} /> },
    ...(puedeEscribir
      ? [
          {
            key: "acciones",
            header: "Acciones",
            align: "right" as const,
            cell: (p: PlanOut) => (
              <div className="flex items-center justify-end gap-1">
                <PlanDialog plan={p} minimo={minimo} moneda={moneda} />
                <AccionesDePlan plan={p} />
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <ListPage
      header={{
        title: "Planes",
        description: "Lo que ofreces y cobras por suscripción: precio, periodicidad y prueba de cada plan.",
        helpSection: "subscriptions",
        actions: puedeEscribir ? <PlanDialog minimo={minimo} moneda={moneda} /> : undefined,
      }}
    >
      <DataTable
        columns={columns}
        rows={planes}
        getRowKey={(p) => p.id}
        emptyTitle="Todavía no tienes planes"
        emptyDescription={
          puedeEscribir
            ? "Crea el primero para que el agente pueda inscribir clientes."
            : "Quien administra el negocio puede crear el primero."
        }
        emptyAction={puedeEscribir ? <PlanDialog minimo={minimo} moneda={moneda} /> : undefined}
        error={res.ok ? null : `No se pudieron cargar los planes: ${res.error}`}
        caption="Planes de suscripción"
      />
    </ListPage>
  );
}
