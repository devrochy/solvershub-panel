import Link from "next/link";

import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { ConsolaConexiones } from "@/app/(app)/conexiones/_components/consola-conexiones";
import { NewConnectionDialog } from "@/app/(app)/conexiones/_components/new-connection-dialog";
import { ChannelBadge } from "@/components/domain/channel-icon";
import { BinaryBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionsConsole, ConnectionsResponse } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Conexiones" };

type ConnectionRow = ConnectionsResponse["items"][number];

const POR_PAGINA = 50;

export default async function ConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const pagina = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const [res, resConsola] = await Promise.all([
    apiFetch<ConnectionsResponse>("/admin/connections"),
    apiFetch<ConnectionsConsole>(`/admin/connections/console?page=${pagina}&page_size=${POR_PAGINA}`),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las conexiones: {res.error}
      </p>
    );
  }
  const { items, webhook_url } = res.data;
  const consola = resConsola.ok ? resConsola.data : null;
  // Sin la consola no se sabe si puede editar: se ocultan las acciones (HU-AOS-23, Permisos).
  const puedeEditar = consola?.can_edit ?? false;

  const columns: Column<ConnectionRow>[] = [
    { key: "origen", header: "Origen", info: "Cómo se creó: formulario manual, OAuth del framework o app propia del negocio (BYOK).", cell: (c) => <span className="text-body">{c.origin}</span> },
    {
      key: "canal",
      header: "Canal",
      cell: (c) => <ChannelBadge id={c.channel} />,
    },
    { key: "etiqueta", header: "Etiqueta", cell: (c) => c.label },
    {
      key: "identificador",
      header: "Identificador",
      info: "ID externo del canal (número, WABA, página…): con él se enrutan los mensajes entrantes.",
      cell: (c) => <span className="font-mono text-xs text-body">{c.external_id}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (c) => (
        <span className="flex items-center gap-2">
          <BinaryBadge active={c.active} activeLabel="Activa" inactiveLabel="Inactiva" />
          {c.coexistence && <Badge variant="accent">coexistencia</Badge>}
        </span>
      ),
    },
    {
      key: "principal",
      header: "Principal",
      cell: (c) =>
        c.is_primary ? <Badge variant="accent">principal</Badge> : <span className="text-text-soft">—</span>,
    },
    {
      key: "creada",
      header: "Creada",
      cell: (c) => <span className="text-body">{formatDateTime(c.created_at)}</span>,
    },
    ...(puedeEditar ? [{
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => (
        <ConnectionActions
          connectionId={c.id}
          label={c.label}
          active={c.active}
          primary={c.is_primary}
          kind={c.kind === "meta_connection" ? "meta_connection" : "channel_connection"}
          typeId={c.kind === "channel_connection" ? c.type_id : null}
        />
      ),
    } satisfies Column<ConnectionRow>] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conexiones"
        description="Canales por los que tu agente atiende. Las credenciales se guardan cifradas (Fernet) y no dependen del .env; cada negocio tiene su propio webhook y verify token."
        helpSection="connections"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="default">
              <Link href="/conexiones/waweb">WhatsApp Web</Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link href="/conexiones/meta">Salud de Meta</Link>
            </Button>
            {puedeEditar && <NewConnectionDialog />}
          </div>
        }
      />

      {consola ? (
        <>
          <ConsolaConexiones consola={consola} />
          {(consola.has_more || pagina > 1) && (
            <Pagination
              page={pagina}
              hasMore={consola.has_more}
              total={consola.total}
              label="conexiones"
              makeHref={(p) => `/conexiones?page=${p}`}
            />
          )}
        </>
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudo cargar la consola de conexiones: {resConsola.ok ? "" : resConsola.error}
        </p>
      )}

      {webhook_url && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook del negocio</CardTitle>
            <p className="text-xs text-text-soft">
              Registralo en Meta con la URL y el verify token que se muestran abajo; sin esto los
              mensajes no llegan al asistente.
            </p>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md bg-bg-deep px-3 py-2 font-mono text-xs text-link">
              {webhook_url}
            </code>
          </CardContent>
        </Card>
      )}

      <h2 className="font-display text-lg font-semibold text-headline">Cuentas y credenciales</h2>
      <DataTable
        columns={columns}
        rows={items}
        getRowKey={(c) => c.id}
        emptyTitle="Sin conexiones todavía"
        emptyDescription="Conecta un canal para que el agente empiece a atender."
      />
    </div>
  );
}
