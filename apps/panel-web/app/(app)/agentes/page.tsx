import { cookies } from "next/headers";

import { AgentCard, EstadoDelAgente, loQueHizo, ultimaConversacion, type AgenteDeLaLista } from "@/app/(app)/agentes/_components/agent-card";
import { AvisoDeReferenciasEnLista } from "@/components/domain/aviso-de-referencias-retiradas";
import { DatosDePruebaParaTodos } from "@/app/(app)/agentes/_components/datos-de-prueba-para-todos";
import { NuevoAgenteBoton } from "@/app/(app)/agentes/_components/nuevo-agente-boton";
import { AgentIcon } from "@/components/domain/agent-icon";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { RecordarVista } from "@/components/domain/recordar-vista";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import type { Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { apiFetch } from "@/lib/api/server";
import type { AgentsOverview, AgentSummary, EstadoDatosDePrueba, Me, PlanResponse, RetiredReferencesOut } from "@/lib/api/types";
import { archivadosAlFinal, dondeAtiende, estaArchivado, papelDelAgente, puedeEditarAgentes, puedeEscribirConocimiento } from "@/lib/agentes";
import { avisoDeTopeDeAgentes } from "@/lib/plan-limite";
import { creditosPorAgenteId } from "@/lib/consumo";
import { formatNumber, formatUsd } from "@/lib/format";
import { VISTAS, vistaElegida, vistaEnEnlace } from "@/lib/vista-guardada";

export const metadata = { title: "Agentes" };

export default async function AgentesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [res, meRes, retiradas, resumenes, plan, sp, jar] = await Promise.all([
    apiFetch<AgentsOverview>("/admin/agents/overview"),
    apiFetch<Me>("/admin/me"),
    // Aviso (HU-AOS-59): sin permiso o sin respuesta, la lista sale igual y sin aviso.
    apiFetch<RetiredReferencesOut>("/admin/agents/retired-references"),
    // El propósito de cada agente y sus créditos del mes (AGT-01): si no responden, la lista sale sin ellos.
    apiFetch<AgentSummary[]>("/admin/agents"),
    apiFetch<PlanResponse>("/admin/plan"),
    searchParams ?? Promise.resolve({} as Record<string, string | string[] | undefined>),
    cookies(),
  ]);
  const guardada = jar.get(VISTAS.agentes.cookie)?.value;
  const vista = vistaElegida("agentes", typeof sp.vista === "string" ? sp.vista : undefined, guardada);
  const enlace = (v: string) => {
    const valor = vistaEnEnlace("agentes", v, guardada);
    return valor ? `/agentes?vista=${valor}` : "/agentes";
  };
  const header = (acciones?: React.ReactNode) => (
    <PageHeader
      title="Agentes"
      description="Quiénes atienden a tus clientes y qué hicieron en los últimos 30 días."
      helpSection="agents"
      actions={acciones}
    />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header()}
        <ErrorDeCarga titulo="No pudimos cargar tus agentes" detalle={res.error} />
      </div>
    );
  }
  const { runtime } = res.data;
  // El General «virtual» (negocio sin el agente General) solo se muestra si tiene algo que ver.
  const items = archivadosAlFinal(res.data.items.filter((a) => !a.virtual || runtime !== "v3" || a.turns > 0));
  // «Generar datos de prueba» para todos (HU-QA-11): solo en test, donde la API de un especialista
  // responde (fuera de test es 404), y con escritura en `agents`.
  const especialistas = items.flatMap((a) =>
    a.id && a.kind === "specialist" && !estaArchivado(a) ? [{ id: a.id, name: a.name }] : [],
  );
  const enTest =
    especialistas.length > 0 && meRes.ok && puedeEscribirConocimiento(meRes.data)
      ? (await apiFetch<EstadoDatosDePrueba>(`/admin/agents/${especialistas[0].id}/datos-de-prueba`)).ok
      : false;
  const conAviso = new Set(retiradas.ok ? retiradas.data.agents.map((a) => a.agent_id) : []);
  const puedeEditar = meRes.ok && puedeEditarAgentes(meRes.data, runtime);
  const avisoTope = avisoDeTopeDeAgentes(res.data.cuota_agentes);
  const propositos = new Map(resumenes.ok ? resumenes.data.map((a) => [a.id, a.description]) : []);
  const delMes = creditosPorAgenteId(plan.ok ? plan.data.credit : null);
  const verCosto = meRes.ok && meRes.data.role === "master";
  const filas: AgenteDeLaLista[] = items.map((agente) => ({
    agente,
    proposito: (agente.id && propositos.get(agente.id)) || null,
    // Un agente sin consumo en el mes no aparece en el desglose: son 0 créditos si el plan mide.
    creditos: delMes.size > 0 ? (agente.id ? (delMes.get(agente.id) ?? 0) : null) : null,
    verCosto,
    conAviso: Boolean(agente.id && conAviso.has(agente.id)),
  }));

  const columnas: Column<AgenteDeLaLista>[] = [
    {
      key: "agente",
      header: "Agente",
      cell: (f) => (
        <span className="flex items-center gap-3">
          <AgentIcon agentKey={f.agente.key} name={f.agente.name} />
          <span className="flex min-w-0 flex-col">
            <span className="font-medium text-headline">{f.agente.name}</span>
            <span className="text-xs text-text-soft">{papelDelAgente(f.agente, f.proposito)}</span>
          </span>
        </span>
      ),
    },
    { key: "estado", header: "Estado", cell: (f) => <EstadoDelAgente agente={f.agente} /> },
    { key: "donde", header: "Dónde atiende", cell: (f) => dondeAtiende(f.agente.connections) },
    {
      key: "conversaciones",
      header: "Conversaciones",
      info: "En los últimos 30 días.",
      align: "right",
      cell: (f) => <span className="tabular-nums">{formatNumber(f.agente.conversations)}</span>,
    },
    ...(filas.some((f) => f.creditos !== null)
      ? [
          {
            key: "creditos",
            header: "Créditos este mes",
            align: "right",
            cell: (f: AgenteDeLaLista) => <span className="tabular-nums">{f.creditos === null ? "—" : formatNumber(Math.round(f.creditos))}</span>,
          } satisfies Column<AgenteDeLaLista>,
        ]
      : []),
    ...(verCosto
      ? [
          {
            key: "costo",
            header: "Costo",
            align: "right",
            cell: (f: AgenteDeLaLista) => <span className="tabular-nums">{f.agente.cost_usd === null ? "—" : formatUsd(f.agente.cost_usd, 2)}</span>,
          } satisfies Column<AgenteDeLaLista>,
        ]
      : []),
    { key: "ultima", header: "Última conversación", cell: (f) => ultimaConversacion(f.agente).replace("Última conversación ", "") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <RecordarVista lista="agentes" vista={vista} />
      {header(
        <>
          {items.length > 0 && (
            <SegmentedControl
              label="Cómo ver los agentes"
              value={vista}
              options={[
                { value: "cuadricula", label: "Cuadrícula", href: enlace("cuadricula") },
                { value: "lista", label: "Lista", href: enlace("lista") },
              ]}
            />
          )}
          {enTest && <DatosDePruebaParaTodos agentes={especialistas} />}
          {/* El editor (HU-AOS-24) escribe en `settings`; sin ese permiso el botón no se muestra. */}
          {puedeEditar && <NuevoAgenteBoton aviso={avisoTope} />}
        </>,
      )}

      {runtime !== "v3" && (
        <p className="rounded-lg border border-status-info-border bg-status-info-bg px-4 py-3 text-sm text-body">
          Tu asistente todavía atiende con un solo agente, el General. Cuando tu negocio tenga especialistas (Ventas,
          Agenda, Cobranza…), cada uno tendrá aquí su propia vista.
        </p>
      )}

      <AvisoDeReferenciasEnLista avisos={retiradas.ok ? retiradas.data : null} />

      {items.length === 0 ? (
        <EmptyState
          title="Todavía no hay agentes"
          description="Cuando tu negocio tenga agentes publicados, aquí verás lo que hace cada uno."
        />
      ) : vista === "lista" ? (
        <TablaResponsiva
          etiqueta="Tus agentes"
          columns={columnas}
          rows={filas}
          getRowKey={(f) => f.agente.ref}
          getRowHref={(f) => `/agentes/${f.agente.ref}`}
          getRowLabel={(f) => `Abrir ${f.agente.name}`}
          caption="Tus agentes"
          filaCelular={(f) => ({
            inicio: <AgentIcon agentKey={f.agente.key} name={f.agente.name} />,
            titulo: f.agente.name,
            detalle: loQueHizo(f),
            fin: <EstadoDelAgente agente={f.agente} />,
            href: `/agentes/${f.agente.ref}`,
          })}
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filas.map((f) => (
            <li key={f.agente.ref} className="flex">
              <AgentCard {...f} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
