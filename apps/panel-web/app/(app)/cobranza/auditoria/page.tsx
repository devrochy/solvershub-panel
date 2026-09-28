import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api/server";

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

const OPERATION_TONE: Record<string, "success" | "danger" | "warning"> = {
  crear: "success",
  editar: "warning",
  eliminar: "danger",
};

function cambios(row: AuditRow): string {
  if (!row.despues && !row.antes) return "—";
  const partes: string[] = [];
  if (row.antes) partes.push(`antes: ${JSON.stringify(row.antes)}`);
  if (row.despues) partes.push(`después: ${JSON.stringify(row.despues)}`);
  return partes.join(" · ");
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entidad?: string; operacion?: string; desde?: string; hasta?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  for (const key of ["entidad", "operacion", "desde", "hasta"] as const) {
    if (sp[key]) qs.set(key, sp[key]);
  }
  const res = await apiFetch<AuditLog>(`/pack/cobranza/audit${qs.size ? `?${qs}` : ""}`);
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar la auditoría: {res.error}
      </p>
    );
  }
  const { entidades, operaciones, filas } = res.data;

  const columns: Column<AuditRow>[] = [
    { key: "fecha", header: "Fecha", cell: (r) => <span className="text-body">{r.fecha || "—"}</span> },
    {
      key: "entidad",
      header: "Entidad",
      cell: (r) => (
        <span className="text-headline">
          {r.entidad} <span className="text-body">#{r.entidad_id}</span>
        </span>
      ),
    },
    {
      key: "operacion",
      header: "Operación",
      cell: (r) => <Badge variant={OPERATION_TONE[r.operacion] ?? "neutral"}>{r.operacion}</Badge>,
    },
    { key: "actor", header: "Actor", cell: (r) => <span className="text-body">{r.actor}</span> },
    { key: "motivo", header: "Motivo", cell: (r) => <span className="text-body">{r.motivo || "—"}</span> },
    {
      key: "cambios",
      header: "Cambios",
      cell: (r) => (
        <span className="text-body text-xs break-all" title={cambios(r)}>
          {cambios(r)}
        </span>
      ),
    },
  ];

  const hayFiltros = Boolean(sp.entidad || sp.operacion || sp.desde || sp.hasta);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auditoría"
        description="Cambios sobre cuotas, abonos, pagos, promesas y préstamos (hasta 200)."
      />
      <form method="get" className="flex flex-wrap items-end gap-3">
        <Field label="Entidad" htmlFor="entidad" className="w-40">
          <Select id="entidad" name="entidad" defaultValue={sp.entidad ?? ""}>
            <option value="">Todas</option>
            {entidades.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Operación" htmlFor="operacion" className="w-40">
          <Select id="operacion" name="operacion" defaultValue={sp.operacion ?? ""}>
            <option value="">Todas</option>
            {operaciones.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Desde" htmlFor="desde" className="w-44">
          <Input id="desde" name="desde" type="date" defaultValue={sp.desde ?? ""} />
        </Field>
        <Field label="Hasta" htmlFor="hasta" className="w-44">
          <Input id="hasta" name="hasta" type="date" defaultValue={sp.hasta ?? ""} />
        </Field>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {hayFiltros && (
          <Link href="/cobranza/auditoria" className="pb-2.5 text-sm text-link hover:underline">
            Limpiar
          </Link>
        )}
      </form>
      <DataTable
        columns={columns}
        rows={filas}
        getRowKey={(r, i) => `${r.fecha}-${r.entidad_id}-${i}`}
        emptyTitle="Sin movimientos"
        emptyDescription="Los cambios auditados de la cartera aparecerán aquí."
      />
    </div>
  );
}
