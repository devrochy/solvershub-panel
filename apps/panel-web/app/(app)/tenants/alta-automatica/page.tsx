import {
  AccionesDeAlta,
  Interruptor,
  PublicarDocumento,
} from "@/app/(app)/tenants/alta-automatica/_components/acciones";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { AltaAutomatica, DocumentoLegal, Me, VendedorAltas } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Alta automática" };

const NOMBRES: Record<string, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Aviso de privacidad",
  dpa: "Acuerdo de tratamiento de datos (DPA)",
};

const SOLO_MASTER = "Solo el admin de plataforma puede ver esto.";

/**
 * Plataforma → Alta automática (HU-SH-07, ADR-0125 de agent-core): la configuración propia
 * del agente de ventas de SolversHub, el que da de alta negocios nuevos solo cuando un
 * cliente compra un plan por WhatsApp. Por cada negocio vendedor: el interruptor ante un
 * ataque, los documentos legales vigentes (con su historial) y la cola de altas en revisión
 * para aprobar o descartar. Solo el master: un tester actúa como master en la API, pero no
 * gestiona la plataforma.
 */
export default async function AltaAutomaticaPage() {
  const [meRes, res] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<VendedorAltas[]>("/admin/platform/altas-automaticas"),
  ]);
  if (!meRes.ok || meRes.data.role !== "master") {
    return (
      <p role="alert" className="text-status-danger-fg">
        {SOLO_MASTER}
      </p>
    );
  }
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {res.status === 403 ? SOLO_MASTER : `Error: ${res.error}`}
      </p>
    );
  }
  const vendedores = res.data;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alta automática"
        description="Configuración propia del agente de ventas de SolversHub: cuando un cliente compra un plan por WhatsApp, el agente crea su negocio solo. Aquí se pausa ante un ataque, se publican los términos que el cliente acepta y se revisan las altas que quedaron frenadas. No es una función de los negocios."
      />
      {vendedores.length === 0 ? (
        <EmptyState
          title="Ningún negocio vende negocios"
          description="El alta automática está apagada: PROVISIONING_SELLER_TENANTS está vacía en este entorno."
        />
      ) : (
        vendedores.map((v) => <Vendedor key={v.id} vendedor={v} />)
      )}
    </div>
  );
}

async function Vendedor({ vendedor }: { vendedor: VendedorAltas }) {
  const base = `/admin/platform/altas-automaticas/${vendedor.id}`;
  const [altasRes, historialRes] = await Promise.all([
    apiFetch<AltaAutomatica[]>(`${base}/altas?estado=revision`),
    apiFetch<DocumentoLegal[]>(`${base}/documentos`),
  ]);
  const altas = altasRes.ok ? altasRes.data : [];
  const historial = historialRes.ok ? historialRes.data : [];
  const { interruptor } = vendedor;

  const columnasAltas: Column<AltaAutomatica>[] = [
    { key: "ref", header: "Pedido", cell: (a) => <span className="font-mono text-xs">{a.referencia}</span> },
    { key: "plan", header: "Plan", cell: (a) => a.plan_id ?? "—" },
    { key: "motivo", header: "Motivo", cell: (a) => <span className="text-body">{a.motivo ?? "—"}</span> },
    { key: "creada", header: "Pedida", cell: (a) => <span className="text-body">{formatDateTime(a.created_at)}</span> },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (a) => <AccionesDeAlta vendedor={vendedor.id} referencia={a.referencia} />,
    },
  ];
  const columnasDocs: Column<DocumentoLegal>[] = [
    { key: "tipo", header: "Documento", cell: (d) => d.nombre },
    { key: "version", header: "Versión", cell: (d) => <span className="font-mono text-xs">{d.version}</span> },
    {
      key: "url",
      header: "Enlace",
      cell: (d) => (
        <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-link hover:underline">
          {d.url}
        </a>
      ),
    },
    { key: "desde", header: "Vigente desde", cell: (d) => <span className="text-body">{formatDateTime(d.vigente_desde)}</span> },
  ];

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="flex items-center gap-2">
            {vendedor.name || vendedor.slug}
            {interruptor.pausado ? (
              <Badge variant="danger">Pausada</Badge>
            ) : (
              <Badge variant="success">Activa</Badge>
            )}
            {!vendedor.activo && <Badge variant="warning">Negocio suspendido</Badge>}
          </CardTitle>
          <CardDescription>
            <span className="font-mono text-xs">{vendedor.slug}</span> · {vendedor.en_revision} en revisión
          </CardDescription>
          {interruptor.pausado && (
            <p className="text-sm text-body">
              Pausada {interruptor.en ? `el ${formatDateTime(interruptor.en)}` : ""}
              {interruptor.por ? ` por ${interruptor.por.replace(/^admin:/, "")}` : ""}
              {interruptor.motivo ? `: ${interruptor.motivo}` : ""}. Las altas nuevas quedan en revisión.
            </p>
          )}
        </div>
        <Interruptor vendedor={vendedor} />
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-medium text-headline">Documentos legales vigentes</h4>
            <PublicarDocumento vendedor={vendedor.id} tipo={vendedor.documentos_faltantes[0]} />
          </div>
          {vendedor.documentos_faltantes.length > 0 && (
            <p role="alert" className="rounded-md bg-status-warning-bg p-3 text-sm text-status-warning-fg">
              Falta publicar: {vendedor.documentos_faltantes.map((t) => NOMBRES[t] ?? t).join(", ")}. Mientras
              falte alguno, el asistente no pide la aceptación y toda alta queda en revisión.
            </p>
          )}
          <DataTable
            columns={columnasDocs}
            rows={vendedor.documentos}
            getRowKey={(d) => `${d.tipo}-${d.version}`}
            emptyTitle="Sin documentos publicados"
            emptyDescription="Publica términos, privacidad y DPA para que el asistente pida la aceptación."
          />
          {historial.length > vendedor.documentos.length && (
            <details className="text-sm">
              <summary className="cursor-pointer text-link">Versiones anteriores</summary>
              <ul className="mt-2 flex flex-col gap-1 text-body">
                {historial.map((d) => (
                  <li key={`${d.tipo}-${d.version}`}>
                    {d.nombre} · <span className="font-mono text-xs">{d.version}</span> ·{" "}
                    {formatDateTime(d.vigente_desde)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="flex flex-col gap-3">
          <h4 className="text-sm font-medium text-headline">Altas en revisión</h4>
          <DataTable
            columns={columnasAltas}
            rows={altas}
            getRowKey={(a) => a.referencia}
            emptyTitle="No hay altas en revisión"
            emptyDescription="Las altas frenadas por el interruptor, los términos o una señal de riesgo aparecen acá."
          />
        </section>
      </CardContent>
    </Card>
  );
}
