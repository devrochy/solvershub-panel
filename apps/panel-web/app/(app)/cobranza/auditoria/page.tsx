import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { StatusBadge, estadoLegible } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { OPERACION_STATUS, cambiosDeAuditoria, entidadLegible, fechaHoraDeApi } from "@/lib/cobranza/presentacion";
import { FiltrosAuditoria, type FiltrosDeAuditoria } from "./_components/filtros-auditoria";

export const metadata = { title: "Auditoría" };

type AuditRow = {
  fecha: string;
  entidad: string;
  entidad_id: string;
  operacion: string;
  antes: Record<string, unknown> | null;
  despues: Record<string, unknown> | null;
  actor: string;
  motivo: string;
};

type AuditLog = { entidades: string[]; operaciones: string[]; filas: AuditRow[] };

function etiquetaDeOperacion(operacion: string): string {
  return OPERACION_STATUS[operacion]?.label ?? estadoLegible(operacion);
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<FiltrosDeAuditoria>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const key of ["entidad", "operacion", "desde", "hasta"] as const) {
    const valor = sp[key];
    if (valor) qs.set(key, valor);
  }
  const res = await apiFetch<AuditLog>(`/pack/cobranza/audit${qs.size ? `?${qs}` : ""}`);
  const header = {
    title: "Auditoría",
    description: "Cambios sobre cuotas, abonos, pagos, promesas y préstamos (hasta 200).",
    helpSection: "cobranza",
  };
  if (!res.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No se pudo cargar la auditoría" detalle={res.error} />
      </ListPage>
    );
  }
  const { entidades, operaciones, filas } = res.data;

  const columns: Column<AuditRow>[] = [
    { key: "fecha", header: "Fecha", cell: (r) => <span className="whitespace-nowrap text-body">{fechaHoraDeApi(r.fecha)}</span> },
    { key: "entidad", header: "Qué cambió", cell: (r) => <span className="font-medium text-headline">{entidadLegible(r.entidad)}</span> },
    { key: "operacion", header: "Operación", cell: (r) => <StatusBadge value={r.operacion} map={OPERACION_STATUS} /> },
    {
      key: "cambios",
      header: "Cambios",
      className: "w-full",
      cell: (r) => (
        <ul className="flex flex-col gap-0.5 text-body">
          {cambiosDeAuditoria(r.antes, r.despues).map((cambio) => (
            <li key={cambio}>{cambio}</li>
          ))}
        </ul>
      ),
    },
    { key: "actor", header: "Quién", cell: (r) => <span className="text-body">{estadoLegible(r.actor)}</span> },
    { key: "motivo", header: "Motivo", cell: (r) => <span className="text-body">{r.motivo || "—"}</span> },
  ];

  return (
    <ListPage
      header={header}
      filters={
        <FiltrosAuditoria
          sp={sp}
          entidades={entidades.map((valor) => ({ valor, etiqueta: entidadLegible(valor) }))}
          operaciones={operaciones.map((valor) => ({ valor, etiqueta: etiquetaDeOperacion(valor) }))}
        />
      }
    >
      <TablaResponsiva
        etiqueta="Movimientos auditados"
        columns={columns}
        rows={filas}
        getRowKey={(r, i) => `${r.fecha}-${r.entidad_id}-${i}`}
        emptyTitle="Sin movimientos"
        emptyDescription="Los cambios auditados de la cartera aparecerán aquí."
        filaCelular={(r) => ({
          titulo: `${entidadLegible(r.entidad)} · ${etiquetaDeOperacion(r.operacion)}`,
          detalle: [cambiosDeAuditoria(r.antes, r.despues).join(" · "), `${estadoLegible(r.actor)}, ${fechaHoraDeApi(r.fecha)}`].filter(Boolean).join(" · "),
        })}
      />
    </ListPage>
  );
}
