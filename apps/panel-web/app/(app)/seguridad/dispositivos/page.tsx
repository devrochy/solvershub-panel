import Link from "next/link";

import { AccionesDeDispositivo } from "@/app/(app)/seguridad/_components/acciones-de-dispositivo";
import { AltaManual } from "@/app/(app)/seguridad/_components/alta-manual";
import { PoliticaDeAcceso } from "@/app/(app)/seguridad/_components/politica-de-acceso";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { FilterChips } from "@/components/ui/filter-chips";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CollaboratorItem, Me } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";
import {
  ESTADOS,
  ESTADO_DISPOSITIVO,
  accionesDeDispositivo,
  contextoDeAcciones,
  nombreDelEquipo,
  rolDelDispositivo,
  type DispositivoAcceso,
  type EstadoDispositivo,
  type PaginaDeDispositivos,
  type PoliticaAcceso,
} from "@/lib/seguridad";

export const metadata = { title: "Dispositivos" };

export default async function DispositivosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; cursor?: string }>;
}) {
  const { estado: estadoCrudo, cursor } = await searchParams;
  const estado = ESTADOS.find((e) => e === estadoCrudo);

  const consulta = new URLSearchParams();
  if (estado) consulta.set("estado", estado);
  if (cursor) consulta.set("cursor", cursor);
  const [lista, politicaRes, meRes] = await Promise.all([
    apiFetch<PaginaDeDispositivos>(`/access/devices${consulta.size ? `?${consulta}` : ""}`),
    apiFetch<PoliticaAcceso>("/access/policy"),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!lista.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los dispositivos: {lista.error}
      </p>
    );
  }
  const me = meRes.ok ? meRes.data : null;
  const ctx = contextoDeAcciones(me);
  const cuentasRes = ctx.puedeEscribir ? await apiFetch<CollaboratorItem[]>("/admin/collaborators") : null;
  const cuentas = cuentasRes?.ok ? cuentasRes.data.filter((c) => c.active).map((c) => ({ id: c.id, email: c.email })) : [];

  const href = (e?: EstadoDispositivo) => (e ? `/seguridad/dispositivos?estado=${e}` : "/seguridad/dispositivos");
  const filas = lista.data.items;

  const columnas: Column<DispositivoAcceso>[] = [
    {
      key: "cuenta",
      header: "Cuenta",
      cell: (d) => (
        <div className="flex flex-col">
          <span className="text-headline">{d.cuenta?.nombre || d.cuenta?.email || "—"}</span>
          {d.cuenta?.nombre && <span className="text-xs text-text-soft">{d.cuenta.email}</span>}
        </div>
      ),
    },
    { key: "rol", header: "Rol", cell: (d) => <span className="text-body">{rolDelDispositivo(d)}</span> },
    {
      key: "equipo",
      header: "Equipo",
      info: "Nombre que reporta la app y los últimos caracteres de su identificador.",
      cell: (d) => (
        <div className="flex flex-col">
          <span className="text-body">{nombreDelEquipo(d)}</span>
          {d.device_id_corto && <span className="font-mono text-xs text-text-soft">…{d.device_id_corto}</span>}
          {d.bloqueo_equipo && <span className="text-xs text-status-danger-fg">Bloqueado para todas las cuentas</span>}
        </div>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (d) => <Badge variant={ESTADO_DISPOSITIVO[d.estado].tone}>{ESTADO_DISPOSITIVO[d.estado].label}</Badge>,
    },
    {
      key: "uso",
      header: "Último uso",
      cell: (d) => <span className="text-body">{d.ultimo_uso_at ? formatDateTime(d.ultimo_uso_at) : "Sin usar"}</span>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (d) => <AccionesDeDispositivo dispositivo={d} acciones={accionesDeDispositivo(d, ctx)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dispositivos"
        description="Los equipos desde los que las cuentas del negocio entran a la app. Aprueba los nuevos y bloquea los que ya no uses."
        actions={ctx.puedeEscribir ? <AltaManual cuentas={cuentas} /> : undefined}
      />
      {politicaRes.ok && <PoliticaDeAcceso politica={politicaRes.data} puedeEditar={ctx.esDuenoOMaster} />}

      <section className="flex flex-col gap-3">
        <FilterChips
          label="Filtrar por estado"
          items={[
            { label: "Todos", href: href(), active: !estado },
            ...ESTADOS.map((e) => ({ label: ESTADO_DISPOSITIVO[e].label, href: href(e), active: estado === e })),
          ]}
        />
        <DataTable
          columns={columnas}
          rows={filas}
          getRowKey={(d) => d.id}
          serverPaginated
          emptyTitle={estado ? "Sin equipos en este estado" : "Todavía no hay equipos"}
          emptyDescription="Cuando alguien entre a la app desde un teléfono, aparecerá aquí."
        />
        <div className="flex justify-end gap-2">
          {cursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(estado)}>Volver al inicio</Link>
            </Button>
          )}
          {lista.data.next_cursor && (
            <Button asChild variant="outline" size="sm">
              <Link href={`${href(estado)}${estado ? "&" : "?"}cursor=${encodeURIComponent(lista.data.next_cursor)}`}>Siguiente</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
