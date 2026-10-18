import Link from "next/link";

import { SinDatos } from "@/app/(app)/agentes/_components/sin-datos";
import { BarChart } from "@/components/dataviz";
import { Badge } from "@/components/ui/badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import type {
  AgentConversationPage,
  AgentCustomerPage,
  AgentRecordPage,
  AgentTaskPage,
  AgentUsage,
} from "@/lib/api/types";
import { consistencia, estadoDeTarea, nombreDeProcedimiento, tipoDeRegistro } from "@/lib/agentes";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/format";
import { canalLabel } from "@/lib/labels";

type ConversationRow = AgentConversationPage["items"][number];
type TaskRow = AgentTaskPage["items"][number];
type RecordRow = AgentRecordPage["items"][number];
type CustomerRow = AgentCustomerPage["items"][number];

function Titulo({ children }: { children: string }) {
  return <h2 className="font-display text-sh-block text-headline">{children}</h2>;
}

export function ConversacionesDelAgente({ page, nombre }: { page: AgentConversationPage; nombre: string }) {
  if (page.total === 0) return <SinDatos que="conversaciones" nombre={nombre} />;
  const columns: Column<ConversationRow>[] = [
    { key: "cliente", header: "Cliente", cell: (r) => r.customer_name ?? "Cliente sin nombre" },
    { key: "conexion", header: "Conexión", cell: (r) => r.connection_label ?? canalLabel(r.channel) },
    {
      key: "version",
      header: "Versión",
      cell: (r) => (r.agent_version ? <Badge variant="neutral">v{r.agent_version}</Badge> : <span className="text-text-soft">Antes del Agent OS</span>),
    },
    { key: "turnos", header: "Turnos", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.turns)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost_usd ?? 0, 4)}</span> },
    { key: "ultimo", header: "Último turno", cell: (r) => formatDateTime(r.last_turn_at) },
    {
      key: "ver",
      header: "Acciones",
      align: "right",
      cell: (r) => (
        <Link href={`/conversaciones/${r.conversation_id}`} className="text-sm text-link hover:underline">
          Ver<span className="sr-only"> la conversación con {r.customer_name ?? "el cliente"}</span>
        </Link>
      ),
    },
  ];
  // El costo solo llega con la sección `costs`: sin él, la columna no se muestra.
  const conCosto = page.items.some((r) => r.cost_usd !== null);
  return (
    <DataTable
      columns={conCosto ? columns : columns.filter((c) => c.key !== "costo")}
      rows={page.items}
      getRowKey={(r) => r.conversation_id}
      caption="Conversaciones que atendió"
    />
  );
}

export function TareasDelAgente({ page, nombre }: { page: AgentTaskPage; nombre: string }) {
  if (page.total === 0) return <SinDatos que="tareas" nombre={nombre} />;
  const columns: Column<TaskRow>[] = [
    { key: "proc", header: "Tarea", cell: (r) => nombreDeProcedimiento(r.procedure_id) },
    {
      key: "estado",
      header: "Estado",
      cell: (r) => <Badge variant={r.open ? "info" : r.status === "completed" ? "success" : "warning"}>{estadoDeTarea(r.status)}</Badge>,
    },
    { key: "etapa", header: "Etapa", cell: (r) => (r.open ? nombreDeProcedimiento(r.stage) : "—") },
    { key: "inicio", header: "Inicio", cell: (r) => formatDateTime(r.created_at) },
    { key: "cambio", header: "Último cambio", cell: (r) => formatDateTime(r.completed_at ?? r.updated_at) },
    {
      key: "ver",
      header: "Acciones",
      align: "right",
      cell: (r) =>
        r.conversation_id ? (
          <Link href={`/conversaciones/${r.conversation_id}`} className="text-sm text-link hover:underline">
            Ver conversación
          </Link>
        ) : null,
    },
  ];
  return <DataTable columns={columns} rows={page.items} getRowKey={(r) => r.id} caption="Tareas del agente" />;
}

export function RegistrosDelAgente({
  records,
  customers,
  nombre,
}: {
  records: AgentRecordPage;
  customers: AgentCustomerPage | null;
  nombre: string;
}) {
  const recordColumns: Column<RecordRow>[] = [
    { key: "tipo", header: "Tipo", cell: (r) => <Badge variant="neutral">{tipoDeRegistro(r.kind)}</Badge> },
    {
      key: "ref",
      header: "Referencia",
      cell: (r) => (r.label ? <span className="font-medium">{r.label}</span> : <span className="font-mono text-xs">{r.record_ref}</span>),
    },
    { key: "conexion", header: "Conexión", cell: (r) => r.connection_label ?? "—" },
    { key: "version", header: "Versión", cell: (r) => (r.agent_version ? `v${r.agent_version}` : "—") },
    { key: "fecha", header: "Creado", cell: (r) => formatDateTime(r.created_at) },
  ];
  const customerColumns: Column<CustomerRow>[] = [
    { key: "nombre", header: "Cliente", cell: (r) => r.name ?? "Cliente sin nombre" },
    { key: "canal", header: "Canal", cell: (r) => canalLabel(r.channel) },
    { key: "convs", header: "Conversaciones", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.conversations)}</span> },
    { key: "ultimo", header: "Último turno", cell: (r) => formatDateTime(r.last_turn_at) },
  ];
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <Titulo>Pedidos, citas, leads y promesas que creó</Titulo>
        {records.total === 0 ? (
          <SinDatos que="registros" nombre={nombre} />
        ) : (
          <DataTable columns={recordColumns} rows={records.items} getRowKey={(r) => r.id} caption="Registros que creó" />
        )}
      </section>
      {customers && (
        <section className="flex flex-col gap-3">
          <Titulo>Clientes que atendió</Titulo>
          {customers.total === 0 ? (
            <SinDatos que="clientes" nombre={nombre} />
          ) : (
            <DataTable
              columns={customerColumns}
              rows={customers.items}
              getRowKey={(r) => r.customer_id}
              caption={`${formatNumber(customers.total)} clientes atendidos`}
            />
          )}
        </section>
      )}
    </div>
  );
}

export function ConsumoDelAgente({ usage, nombre }: { usage: AgentUsage; nombre: string }) {
  const { actual, k, delta } = consistencia(usage.consistency.measurements);
  const porDia = usage.by_day.map((d) => ({ x: d.day, values: { turnos: d.turns } }));
  const conexionColumns: Column<AgentUsage["by_connection"][number]>[] = [
    { key: "conexion", header: "Conexión", cell: (r) => r.connection_label ?? "Antes del Agent OS" },
    { key: "turnos", header: "Turnos", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.turns)}</span> },
    { key: "tokens", header: "Tokens", align: "right", cell: (r) => <span className="tabular-nums">{formatNumber(r.input_tokens + r.output_tokens)}</span> },
    { key: "costo", header: "Costo", align: "right", cell: (r) => <span className="tabular-nums">{formatUsd(r.cost_usd ?? 0, 4)}</span> },
  ];
  const conCosto = usage.total.cost_usd !== null;
  return (
    <div className="flex flex-col gap-6">
      <div className={`grid gap-4 sm:grid-cols-2 ${conCosto ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <KpiTile label="Turnos atendidos" value={formatNumber(usage.total.turns)} />
        <KpiTile label="Tokens" value={formatNumber(usage.total.input_tokens + usage.total.output_tokens)} />
        {usage.total.cost_usd !== null && (
          <KpiTile label="Costo del período" value={formatUsd(usage.total.cost_usd, 2)} tone="accent" />
        )}
        <KpiTile
          label={k ? `Consistencia pass^${k}` : "Consistencia"}
          value={actual === null ? "—" : `${actual.toLocaleString("es-CO")} %`}
          hint={
            actual === null
              ? "Sin medición todavía: aparece cuando se mida la consistencia del negocio."
              : delta === null
                ? "Del negocio, no solo de este agente."
                : `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta).toLocaleString("es-CO")} puntos frente a la medición anterior · del negocio`
          }
        />
      </div>
      {usage.incluye_sin_atribuir && (
        <p className="text-sh-caption text-text-soft">
          Incluye lo que atendió el asistente antes del Agent OS: entonces todo lo atendía el General.
        </p>
      )}
      {usage.total.turns === 0 ? (
        <SinDatos que="consumo" nombre={nombre} />
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <Titulo>Turnos por día</Titulo>
            <BarChart title="Turnos por día" series={[{ key: "turnos", label: "Turnos" }]} data={porDia} height={220} />
          </section>
          <section className="flex flex-col gap-3">
            <Titulo>Por conexión</Titulo>
            <DataTable
              columns={conCosto ? conexionColumns : conexionColumns.filter((c) => c.key !== "costo")}
              rows={usage.by_connection}
              getRowKey={(r, i) => `${r.connection_id ?? "sin"}-${i}`}
              caption="Consumo por conexión"
            />
          </section>
        </>
      )}
    </div>
  );
}
