import { PromiseStatus } from "@/app/(app)/cobranza/promesas/_components/promise-status";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { SeccionPlegada } from "@/components/domain/cobranza/seccion-plegada";
import { StatusBadge } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { Contador } from "@/components/ui/contador";
import { EmptyState } from "@/components/ui/empty-state";
import { apiFetch, getBusinessTimezone } from "@/lib/api/server";
import {
  TITULO_DE_GRUPO,
  agruparPromesas,
  cuandoEs,
  fechaDeHoy,
  type GrupoDeAgenda,
  type PromesaDeAgenda,
} from "@/lib/cobranza/agenda";
import { PROMESA_STATUS, loQueCubre, quienPacto } from "@/lib/cobranza/presentacion";
import { formatCop } from "@/lib/format";

export const metadata = { title: "Promesas" };

const ORDEN: GrupoDeAgenda[] = ["vencidas", "hoy", "semana", "despues"];

function FilaDePromesa({ promesa: p, cuando }: { promesa: PromesaDeAgenda; cuando?: string }) {
  const detalle = [cuando, loQueCubre(p.alcance, p.tipo), `Pactó ${quienPacto(p.creado_por)}`].filter(Boolean).join(" · ");
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border-soft py-3 first:border-t-0">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-headline">{p.cliente}</span>
        <span className="text-xs text-text-soft">{detalle}</span>
      </div>
      <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between">
        <span className="text-sm font-medium tabular-nums text-headline">{formatCop(p.valor_prometido)}</span>
        {p.estado !== "pendiente" && <StatusBadge value={p.estado} map={PROMESA_STATUS} />}
        <PromiseStatus promiseId={p.id} estado={p.estado} cliente={p.cliente} />
      </div>
    </li>
  );
}

export default async function PromisesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const sp = await searchParams;
  const [res, zona] = await Promise.all([
    apiFetch<PromesaDeAgenda[]>("/pack/cobranza/promises"),
    getBusinessTimezone(),
  ]);
  const header = { title: "Promesas", description: "Promesas de pago del agente y de los gestores." };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No se pudieron cargar las promesas" detalle={res.error} />
      </ListPage>
    );
  }

  const hoy = fechaDeHoy(zona);
  const { grupos, decididas } = agruparPromesas(res.data, hoy);
  const conPendientes = ORDEN.filter((grupo) => grupos[grupo].length > 0);

  return (
    <ListPage header={header}>
      {res.data.length === 0 && (
        <div className="rounded-lg border border-border-soft bg-surface">
          <EmptyState title="Sin promesas" description="Cuando el agente pacte una promesa, aparecerá aquí con su fecha." />
        </div>
      )}
      {res.data.length > 0 && conPendientes.length === 0 && (
        <p className="rounded-lg border border-border-soft bg-surface px-4 py-3 text-sm text-body">No hay promesas pendientes.</p>
      )}
      {conPendientes.map((grupo) => (
        <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="rounded-lg border border-border-soft bg-surface px-5 py-4">
          <div className="flex items-center gap-2 pb-1">
            <h2 id={`grupo-${grupo}`} className="font-display text-sh-block text-headline">
              {TITULO_DE_GRUPO[grupo]}
            </h2>
            <Contador
              valor={grupos[grupo].length}
              tono={grupo === "vencidas" ? "alerta" : "normal"}
              etiqueta={`${grupos[grupo].length} ${grupos[grupo].length === 1 ? "promesa" : "promesas"}`}
            />
          </div>
          <ul>
            {grupos[grupo].map((p) => (
              <FilaDePromesa key={p.id} promesa={p} cuando={grupo === "hoy" ? undefined : cuandoEs(p.fecha_prometida, hoy)} />
            ))}
          </ul>
        </section>
      ))}
      {decididas.length > 0 && (
        <SeccionPlegada
          titulo="Cumplidas e incumplidas"
          conteo={decididas.length}
          abierta={sp.estado === "cumplida" || sp.estado === "incumplida"}
        >
          <ul>
            {decididas.map((p) => (
              <FilaDePromesa key={p.id} promesa={p} cuando={cuandoEs(p.fecha_prometida, hoy)} />
            ))}
          </ul>
        </SeccionPlegada>
      )}
    </ListPage>
  );
}
