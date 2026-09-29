import Link from "next/link";

import { ConnectionActions } from "@/app/(app)/conexiones/_components/connection-actions";
import { NewConnectionDialog } from "@/app/(app)/conexiones/_components/new-connection-dialog";
import { ChannelBadge } from "@/components/domain/channel-icon";
import { BinaryBadge } from "@/components/domain/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { ConnectionsResponse } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Conexiones" };

type ConnectionRow = ConnectionsResponse["items"][number];

export default async function ConnectionsPage() {
  const res = await apiFetch<ConnectionsResponse>("/admin/connections");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar las conexiones: {res.error}
      </p>
    );
  }
  const { items, webhook_url } = res.data;

  const columns: Column<ConnectionRow>[] = [
    { key: "origen", header: "Origen", cell: (c) => <span className="text-body">{c.origin}</span> },
    {
      key: "canal",
      header: "Canal",
      cell: (c) => <ChannelBadge id={c.channel} />,
    },
    { key: "etiqueta", header: "Etiqueta", cell: (c) => c.label },
    {
      key: "identificador",
      header: "Identificador",
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
    {
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
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conexiones"
        description="Canales por los que tu agente atiende. Cada negocio tiene su propio webhook."
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="default">
              <Link href="/conexiones/waweb">WhatsApp Web</Link>
            </Button>
            <Button asChild variant="outline" size="default">
              <Link href="/conexiones/meta">Salud de Meta</Link>
            </Button>
            <NewConnectionDialog />
          </div>
        }
      />

      {webhook_url && (
        <Card>
          <CardHeader>
            <CardTitle>Webhook del negocio</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="block break-all rounded-md bg-bg-deep px-3 py-2 font-mono text-xs text-accent">
              {webhook_url}
            </code>
          </CardContent>
        </Card>
      )}

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
