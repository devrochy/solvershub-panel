import { SinDatos } from "@/app/(app)/agentes/_components/sin-datos";
import { BarChart } from "@/components/dataviz";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import type {
  AgentConversationPage,
  AgentCustomerPage,
  AgentRecordPage,
  AgentTaskPage,
  AgentUsage,
} from "@/lib/api/types";
import {
  consistencia,
  estadoDeConversacion,
  estadoDeTarea,
  nombreDeEtapa,
  nombreDeProcedimiento,
  respuestas,
  tipoDeRegistro,
} from "@/lib/agentes";
import { creditos } from "@/lib/consumo";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";
import { canalLabel } from "@/lib/labels";
import { tiempoRelativo } from "@/lib/notificaciones/tipos";

type ConversationRow = AgentConversationPage["items"][number];
type TaskRow = AgentTaskPage["items"][number];
type RecordRow = AgentRecordPage["items"][number];
type CustomerRow = AgentCustomerPage["items"][number];

function Titulo({ children }: { children: string }) {
  return <h2 className="font-display text-sh-block text-headline">{children}</h2>;
}

function EstadoDeConversacion({ status }: { status: string | null }) {
  const estado = estadoDeConversacion(status);
  return estado ? <Badge variant={estado.tono}>{estado.label}</Badge> : null;
}

function EstadoDeTarea({ fila }: { fila: TaskRow }) {
  const tono = fila.open ? "info" : fila.status === "completed" ? "success" : "warning";
  return <Badge variant={tono}>{estadoDeTarea(fila.status)}</Badge>;
}

const conexionDe = (r: { connection_label: string | null; channel?: string | null }) => r.connection_label ?? canalLabel(r.channel ?? null);

/**
 * Conversaciones que atendió (AGT-06): la fila abre la conversación. Los dólares solo para el master
 * (`verCosto`); la versión del agente vive en el detalle de la conversación.
 */
export function ConversacionesDelAgente({ page, nombre, verCosto }: { page: AgentConversationPage; nombre: string; verCosto: boolean }) {
  if (page.total === 0) return <SinDatos que="conversaciones" nombre={nombre} />;
  const columns: Column<ConversationRow>[] = [
    {
      key: "cliente",
      header: "Cliente",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-medium text-headline">{r.customer_name ?? "Cliente sin nombre"}</span>
          <span className="text-xs text-text-soft">{conexionDe(r)}</span>
        </span>
      ),
    },
    { key: "respuestas", header: "Respuestas", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.turns)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost_usd ?? 0, 4)}</span> },
    { key: "estado", header: "Estado", cell: (r) => <EstadoDeConversacion status={r.status} /> },
    { key: "ultimo", header: "Último mensaje", cell: (r) => <span title={formatDateTime(r.last_turn_at)}>{tiempoRelativo(r.last_turn_at)}</span> },
  ];
  const conCosto = verCosto && page.items.some((r) => r.cost_usd !== null);
  return (
    <TablaResponsiva
      etiqueta="Conversaciones que atendió"
      columns={conCosto ? columns : columns.filter((c) => c.key !== "costo")}
      rows={page.items}
      getRowKey={(r) => r.conversation_id}
      getRowHref={(r) => `/conversaciones/${r.conversation_id}`}
      getRowLabel={(r) => `Abrir la conversación con ${r.customer_name ?? "el cliente"}`}
      caption="Conversaciones que atendió"
      serverPaginated
      filaCelular={(r) => ({
        titulo: r.customer_name ?? "Cliente sin nombre",
        detalle: `${conexionDe(r)} · ${tiempoRelativo(r.last_turn_at)} · ${respuestas(r.turns)}`,
        fin: <EstadoDeConversacion status={r.status} />,
        href: `/conversaciones/${r.conversation_id}`,
      })}
    />
  );
}

/** Tareas (AGT-06, AGT-07): la etapa en palabras y, si falló o pasó a una persona, por qué. */
export function TareasDelAgente({ page, nombre }: { page: AgentTaskPage; nombre: string }) {
  if (page.total === 0) return <SinDatos que="tareas" nombre={nombre} />;
  const enlace = (r: TaskRow) => (r.conversation_id ? `/conversaciones/${r.conversation_id}` : undefined);
  const columns: Column<TaskRow>[] = [
    {
      key: "proc",
      header: "Tarea",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-medium text-headline">{nombreDeProcedimiento(r.procedure_id)}</span>
          {r.open && <span className="text-xs text-text-soft">Va en: {nombreDeEtapa(r.stage)}</span>}
        </span>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (r) => (
        <span className="flex flex-col items-start gap-1">
          <EstadoDeTarea fila={r} />
          {r.status_reason && <span className="max-w-xs text-xs text-text-soft">{r.status_reason}</span>}
        </span>
      ),
    },
    { key: "inicio", header: "Empezó", cell: (r) => <span title={formatDateTime(r.created_at)}>{tiempoRelativo(r.created_at)}</span> },
    {
      key: "cambio",
      header: "Último cambio",
      cell: (r) => <span title={formatDateTime(r.completed_at ?? r.updated_at)}>{tiempoRelativo(r.completed_at ?? r.updated_at)}</span>,
    },
  ];
  // La fila abre la conversación de la tarea; sin conversación (una tarea interna), no abre nada.
  const conEnlace = page.items.every((r) => r.conversation_id);
  return (
    <TablaResponsiva
      etiqueta="Tareas del agente"
      columns={columns}
      rows={page.items}
      getRowKey={(r) => r.id}
      {...(conEnlace
        ? {
            getRowHref: (r: TaskRow) => `/conversaciones/${r.conversation_id}`,
            getRowLabel: (r: TaskRow) => `Abrir la conversación de «${nombreDeProcedimiento(r.procedure_id)}»`,
          }
        : {})}
      caption="Tareas del agente"
      serverPaginated
      filaCelular={(r) => ({
        titulo: nombreDeProcedimiento(r.procedure_id),
        detalle: r.status_reason ?? (r.open ? `Va en: ${nombreDeEtapa(r.stage)}` : tiempoRelativo(r.completed_at ?? r.updated_at)),
        fin: <EstadoDeTarea fila={r} />,
        href: enlace(r),
      })}
    />
  );
}

/** Pedidos, citas, leads y promesas que creó; la fila abre la conversación donde lo creó. */
export function RegistrosDelAgente({ records, nombre }: { records: AgentRecordPage; nombre: string }) {
  if (records.total === 0) return <SinDatos que="registros" nombre={nombre} />;
  const columns: Column<RecordRow>[] = [
    { key: "tipo", header: "Tipo", cell: (r) => <Badge variant="neutral">{tipoDeRegistro(r.kind)}</Badge> },
    { key: "ref", header: "Qué creó", cell: (r) => <span className="font-medium text-headline">{r.label ?? tipoDeRegistro(r.kind)}</span> },
    { key: "conexion", header: "Conexión", cell: (r) => r.connection_label ?? "—" },
    { key: "fecha", header: "Cuándo", cell: (r) => <span title={formatDateTime(r.created_at)}>{tiempoRelativo(r.created_at)}</span> },
  ];
  const conEnlace = records.items.every((r) => r.conversation_id);
  return (
    <section className="flex flex-col gap-3">
      <Titulo>Pedidos, citas, leads y promesas que creó</Titulo>
      <TablaResponsiva
        etiqueta="Registros que creó"
        columns={columns}
        rows={records.items}
        getRowKey={(r) => r.id}
        {...(conEnlace
          ? {
              getRowHref: (r: RecordRow) => `/conversaciones/${r.conversation_id}`,
              getRowLabel: (r: RecordRow) => `Abrir la conversación donde creó ${r.label ?? tipoDeRegistro(r.kind)}`,
            }
          : {})}
        caption="Registros que creó"
        serverPaginated
        filaCelular={(r) => ({
          titulo: r.label ?? tipoDeRegistro(r.kind),
          detalle: `${tipoDeRegistro(r.kind)} · ${tiempoRelativo(r.created_at)}`,
          href: r.conversation_id ? `/conversaciones/${r.conversation_id}` : undefined,
        })}
      />
    </section>
  );
}

/** Clientes que atendió. */
export function ClientesDelAgente({ customers, nombre }: { customers: AgentCustomerPage; nombre: string }) {
  if (customers.total === 0) return <SinDatos que="clientes" nombre={nombre} />;
  const columns: Column<CustomerRow>[] = [
    { key: "nombre", header: "Cliente", cell: (r) => <span className="font-medium text-headline">{r.name ?? "Cliente sin nombre"}</span> },
    { key: "canal", header: "Canal", cell: (r) => canalLabel(r.channel) },
    { key: "convs", header: "Conversaciones", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.conversations)}</span> },
    { key: "ultimo", header: "Último mensaje", cell: (r) => <span title={formatDateTime(r.last_turn_at)}>{tiempoRelativo(r.last_turn_at)}</span> },
  ];
  return (
    <TablaResponsiva
      etiqueta={`${formatNumber(customers.total)} clientes atendidos`}
      columns={columns}
      rows={customers.items}
      getRowKey={(r) => r.customer_id}
      caption={`${formatNumber(customers.total)} clientes atendidos`}
      serverPaginated
      filaCelular={(r) => ({
        titulo: r.name ?? "Cliente sin nombre",
        detalle: `${canalLabel(r.channel)} · ${tiempoRelativo(r.last_turn_at)}`,
        fin: formatNumber(r.conversations),
      })}
    />
  );
}

/**
 * Consumo del agente (AGT-03): respuestas por día y por conexión, en créditos del plan. Tokens y
 * dólares son de proveedor: solo los ve el master.
 */
export function ConsumoDelAgente({
  usage,
  nombre,
  creditosDelMes,
  verCosto,
}: {
  usage: AgentUsage;
  nombre: string;
  creditosDelMes: number | null;
  verCosto: boolean;
}) {
  const { actual, delta } = consistencia(usage.consistency.measurements);
  const porDia = usage.by_day.map((d) => ({ x: d.day, values: { respuestas: d.turns } }));
  const conexionColumns: Column<AgentUsage["by_connection"][number]>[] = [
    { key: "conexion", header: "Conexión", cell: (r) => r.connection_label ?? "Antes de tener especialistas" },
    { key: "respuestas", header: "Respuestas", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.turns)}</span> },
    { key: "tokens", header: "Tokens", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.input_tokens + r.output_tokens)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost_usd ?? 0, 4)}</span> },
  ];
  const conCosto = verCosto && usage.total.cost_usd !== null;
  return (
    <div className="flex flex-col gap-6">
      <div className={`grid gap-4 sm:grid-cols-2 ${verCosto ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <KpiTile label="Respuestas en el período" value={formatNumber(usage.total.turns)} />
        <KpiTile
          label="Créditos este mes"
          value={creditosDelMes === null ? "—" : creditos(creditosDelMes)}
          hint={creditosDelMes === null ? "Tu plan no mide créditos." : "Del crédito mensual de tu plan."}
        />
        {verCosto && (
          <KpiTile
            label="Costo de proveedor"
            value={conCosto ? formatUsd(usage.total.cost_usd ?? 0, 2) : "—"}
            hint={`${formatNumber(usage.total.input_tokens + usage.total.output_tokens)} tokens · solo lo ves tú`}
            tone="accent"
          />
        )}
        <KpiTile
          label="Responde igual en las pruebas"
          value={actual === null ? "—" : `${actual.toLocaleString("es-CO")} %`}
          hint={
            actual === null
              ? "Aparece cuando se prueben las respuestas de tu asistente antes de publicar."
              : delta === null
                ? "De todo tu asistente, no solo de este agente."
                : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toLocaleString("es-CO")} puntos frente a la prueba anterior · de todo tu asistente`
          }
        />
      </div>
      {usage.incluye_sin_atribuir && (
        <p className="text-sh-caption text-text-soft">
          Incluye lo que atendió el asistente antes de tener especialistas: entonces todo lo atendía el General.
        </p>
      )}
      {usage.total.turns === 0 ? (
        <SinDatos que="consumo" nombre={nombre} />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <Titulo>Respuestas por día</Titulo>
            <BarChart title="Respuestas por día" series={[{ key: "respuestas", label: "Respuestas" }]} data={porDia} height={220} />
          </section>
          <section className="flex flex-col gap-3">
            <Titulo>Por conexión</Titulo>
            <TablaResponsiva
              etiqueta="Respuestas por conexión"
              columns={verCosto ? (conCosto ? conexionColumns : conexionColumns.filter((c) => c.key !== "costo")) : conexionColumns.filter((c) => c.key === "conexion" || c.key === "respuestas")}
              rows={usage.by_connection}
              getRowKey={(r, i) => `${r.connection_id ?? "sin"}-${i}`}
              caption="Respuestas por conexión"
              filaCelular={(r) => ({
                titulo: r.connection_label ?? "Antes de tener especialistas",
                fin: respuestas(r.turns),
              })}
            />
          </section>
        </>
      )}
    </div>
  );
}
