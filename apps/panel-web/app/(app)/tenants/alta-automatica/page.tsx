import { redirect } from "next/navigation";

import {
  AccionesDeAlta,
  Interruptor,
  PublicarDocumento,
} from "@/app/(app)/tenants/alta-automatica/_components/acciones";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { AltaAutomatica, DocumentoLegal, Me, PlanResponse, VendedorAltas } from "@/lib/api/types";
import { tiempoRelativo } from "@/lib/notificaciones/tipos";
import { diaEnPalabras, versionEnPalabras } from "@/lib/plataforma";

export const metadata = { title: "Alta automática" };

const NOMBRES: Record<string, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Aviso de privacidad",
  dpa: "Acuerdo de tratamiento de datos (DPA)",
};


/**
 * Plataforma → Alta automática (HU-SH-07, ADR-0125 de agent-core): la configuración propia
 * del agente de ventas de SolversHub, el que da de alta negocios nuevos solo cuando un
 * cliente compra un plan por WhatsApp. Por cada negocio vendedor: el interruptor ante un
 * ataque, los documentos legales vigentes (con su historial) y la cola de altas en revisión
 * para aprobar o descartar. Solo el master: un tester actúa como master en la API, pero no
 * gestiona la plataforma.
 */
export default async function AltaAutomaticaPage() {
  const [meRes, res, planes] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<VendedorAltas[]>("/admin/platform/altas-automaticas"),
    apiFetch<PlanResponse>("/admin/plan"),
  ]);
  // PLT-04: quien no es master no llega a una página de error, vuelve a Negocios.
  if (!meRes.ok || meRes.data.role !== "master" || (!res.ok && res.status === 403)) redirect("/tenants");
  const header = <PageHeader title="Alta automática" helpSection="alta_automatica" />;
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar el alta automática" detalle={res.error} />
      </div>
    );
  }
  const nombreDePlan = (id: string | null) =>
    (id && planes.ok ? planes.data.plans.find((p) => p.id === id)?.name : null) ?? (id ? id.charAt(0).toUpperCase() + id.slice(1) : "Sin plan");

  return (
    <div className="flex flex-col gap-6">
      {header}
      {res.data.length === 0 ? (
        <EmptyState
          title="Ningún negocio vende negocios"
          description="El alta automática está apagada en este entorno: falta configurar PROVISIONING_SELLER_TENANTS."
        />
      ) : (
        res.data.map((v) => <Vendedor key={v.id} vendedor={v} nombreDePlan={nombreDePlan} />)
      )}
    </div>
  );
}

function Documento({ d }: { d: DocumentoLegal }) {
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-border-soft px-4 py-3 first:border-t-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium text-headline">{d.nombre}</span>
        <span className="text-xs text-text-soft">
          Versión de {versionEnPalabras(d.version)} · desde el {diaEnPalabras(d.vigente_desde)}
        </span>
      </span>
      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-sm text-link hover:underline">
        {/\.pdf($|\?)/i.test(d.url) ? "Ver PDF" : "Ver documento"}
        <span className="sr-only"> de {d.nombre} (se abre en una pestaña nueva)</span>
      </a>
    </li>
  );
}

async function Vendedor({ vendedor, nombreDePlan }: { vendedor: VendedorAltas; nombreDePlan: (id: string | null) => string }) {
  const base = `/admin/platform/altas-automaticas/${vendedor.id}`;
  const [altasRes, historialRes] = await Promise.all([
    apiFetch<AltaAutomatica[]>(`${base}/altas?estado=revision`),
    apiFetch<DocumentoLegal[]>(`${base}/documentos`),
  ]);
  const altas = altasRes.ok ? altasRes.data : [];
  const historial = historialRes.ok ? historialRes.data : [];
  const vigentes = new Set(vendedor.documentos.map((d) => `${d.tipo}-${d.version}`));
  const anteriores = historial.filter((d) => !vigentes.has(`${d.tipo}-${d.version}`));
  const { interruptor } = vendedor;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            {vendedor.name || vendedor.slug}
            {interruptor.pausado ? <Badge variant="danger">Pausada</Badge> : <Badge variant="success">Activa</Badge>}
            {!vendedor.activo && <Badge variant="warning">Negocio suspendido</Badge>}
          </CardTitle>
          <CardDescription>Crea el negocio solo cuando un cliente compra un plan por WhatsApp.</CardDescription>
          {interruptor.pausado && (
            <p className="text-sm text-body">
              Pausada {interruptor.en ? `el ${diaEnPalabras(interruptor.en)}` : ""}
              {interruptor.por ? ` por ${interruptor.por.replace(/^admin:/, "")}` : ""}
              {interruptor.motivo ? `: ${interruptor.motivo}` : ""}. Las altas nuevas quedan en revisión.
            </p>
          )}
        </div>
        <Interruptor vendedor={vendedor} />
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {/* PLT-06: primero lo que espera una decisión. */}
        <section aria-labelledby={`revision-${vendedor.id}`} className="flex flex-col gap-3">
          <h4 id={`revision-${vendedor.id}`} className="text-sm font-medium text-headline">
            Altas en revisión ({altas.length})
          </h4>
          {altas.length === 0 ? (
            <p className="text-sm text-text-soft">
              Nada que revisar. Las altas que el agente no pueda terminar solo aparecen aquí.
            </p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
              {altas.map((a) => (
                <li key={a.referencia} className="flex flex-wrap items-center gap-3 border-t border-border-soft px-4 py-3 first:border-t-0">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium text-headline">{a.motivo ?? "Quedó en revisión"}</span>
                    <span className="text-xs text-text-soft">
                      Plan {nombreDePlan(a.plan_id)} · pedida {tiempoRelativo(a.created_at)} ·{" "}
                      {a.intentos === 1 ? "1 intento" : `${a.intentos} intentos`} · {a.referencia}
                    </span>
                  </span>
                  <AccionesDeAlta vendedor={vendedor.id} referencia={a.referencia} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby={`docs-${vendedor.id}`} className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h4 id={`docs-${vendedor.id}`} className="text-sm font-medium text-headline">
              Documentos que acepta el cliente
            </h4>
            <PublicarDocumento vendedor={vendedor.id} tipo={vendedor.documentos_faltantes[0]} />
          </div>
          {vendedor.documentos_faltantes.length > 0 && (
            <p role="status" className="rounded-md bg-status-warning-bg p-3 text-sm text-status-warning-fg">
              Falta publicar: {vendedor.documentos_faltantes.map((t) => NOMBRES[t] ?? t).join(", ")}. Mientras falte alguno,
              el asistente no pide la aceptación y toda alta queda en revisión.
            </p>
          )}
          {vendedor.documentos.length === 0 ? (
            <p className="text-sm text-text-soft">Publica términos, privacidad y DPA para que el asistente pida la aceptación.</p>
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border-soft bg-surface">
              {vendedor.documentos.map((d) => (
                <Documento key={`${d.tipo}-${d.version}`} d={d} />
              ))}
            </ul>
          )}
          {anteriores.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-link">Versiones anteriores ({anteriores.length})</summary>
              <ul className="mt-2 overflow-hidden rounded-lg border border-border-soft bg-surface">
                {anteriores.map((d) => (
                  <Documento key={`${d.tipo}-${d.version}`} d={d} />
                ))}
              </ul>
            </details>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
