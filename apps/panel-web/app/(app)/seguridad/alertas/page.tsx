import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterChips } from "@/components/ui/filter-chips";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { formatDateTime } from "@/lib/format";
import {
  CANAL,
  SEVERIDAD,
  SEVERIDADES,
  TIPO_EVENTO,
  type EventoAcceso,
  type PaginaDeEventos,
  type SeveridadEvento,
} from "@/lib/seguridad";

export const metadata = { title: "Alertas de acceso" };

export default async function AlertasPage({
  searchParams,
}: {
  searchParams: Promise<{ severidad?: string; cursor?: string }>;
}) {
  const { severidad: severidadCruda, cursor } = await searchParams;
  const severidad = SEVERIDADES.find((s) => s === severidadCruda);

  const consulta = new URLSearchParams();
  if (severidad) consulta.set("severidad", severidad);
  if (cursor) consulta.set("cursor", cursor);
  const res = await apiFetch<PaginaDeEventos>(`/access/events${consulta.size ? `?${consulta}` : ""}`);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las alertas: {res.error}
      </p>
    );
  }

  const href = (s?: SeveridadEvento) => (s ? `/seguridad/alertas?severidad=${s}` : "/seguridad/alertas");

  const columnas: Column<EventoAcceso>[] = [
    { key: "fecha", header: "Fecha", cell: (e) => <span className="text-body">{formatDateTime(e.occurred_at)}</span> },
    {
      key: "tipo",
      header: "Evento",
      cell: (e) => (
        <div className="flex flex-col gap-1">
          <span className="text-headline">{TIPO_EVENTO[e.tipo]}</span>
          <Badge variant={SEVERIDAD[e.severidad].tone} className="w-fit">
            {SEVERIDAD[e.severidad].label}
          </Badge>
        </div>
      ),
    },
    {
      key: "cuenta",
      header: "Cuenta",
      cell: (e) => <span className="text-body">{e.cuenta?.email ?? "—"}</span>,
    },
    {
      key: "equipo",
      header: "Equipo",
      cell: (e) => (
        <span className="font-mono text-xs text-body">{e.device_id_corto ? `…${e.device_id_corto}` : "—"}</span>
      ),
    },
    { key: "canal", header: "Desde", cell: (e) => <span className="text-body">{CANAL[e.canal]}</span> },
    { key: "ip", header: "IP", cell: (e) => <span className="text-body">{e.ip ?? "—"}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Alertas de acceso"
        description="Lo que pasó con los accesos del negocio: equipos nuevos, intentos fallidos y cambios de política, del más reciente al más antiguo."
      />
      <FilterChips
        label="Filtrar por severidad"
        items={[
          { label: "Todas", href: href(), active: !severidad },
          ...SEVERIDADES.map((s) => ({ label: SEVERIDAD[s].label, href: href(s), active: severidad === s })),
        ]}
      />
      <DataTable
        columns={columnas}
        rows={res.data.items}
        getRowKey={(e) => e.id}
        serverPaginated
        emptyTitle="Sin alertas"
        emptyDescription="Cuando una cuenta entre desde un equipo nuevo o falle un acceso, aparecerá aquí."
      />
      <div className="flex justify-end gap-2">
        {cursor && (
          <Button asChild variant="outline" size="sm">
            <Link href={href(severidad)}>Volver al inicio</Link>
          </Button>
        )}
        {res.data.next_cursor && (
          <Button asChild variant="outline" size="sm">
            <Link href={`${href(severidad)}${severidad ? "&" : "?"}cursor=${encodeURIComponent(res.data.next_cursor)}`}>Siguiente</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
