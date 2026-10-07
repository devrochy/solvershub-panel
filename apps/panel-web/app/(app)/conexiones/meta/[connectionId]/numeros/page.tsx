import Link from "next/link";

import { AddNumberDialog } from "@/app/(app)/conexiones/meta/[connectionId]/numeros/_components/add-number-dialog";
import { NumberActions } from "@/app/(app)/conexiones/meta/[connectionId]/numeros/_components/number-actions";
import { RegisterNumberDialog } from "@/app/(app)/conexiones/meta/[connectionId]/numeros/_components/register-number-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Números" };

type PhoneNumberItem = {
  id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  status: string;
  registered: boolean;
};

export default async function NumbersPage({
  params,
}: {
  params: Promise<{ connectionId: string }>;
}) {
  const { connectionId } = await params;
  const res = await apiFetch<{ numbers: PhoneNumberItem[]; sync_error: string | null }>(
    `/admin/meta/connections/${connectionId}/numbers`,
  );
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los números: {res.error}
      </p>
    );
  }
  const { numbers, sync_error } = res.data;

  const columns: Column<PhoneNumberItem>[] = [
    {
      key: "numero",
      header: "Número",
      cell: (n) => <span className="text-headline">{n.display_phone_number ?? "—"}</span>,
    },
    {
      key: "id",
      header: "Phone number ID",
      cell: (n) => <span className="font-mono text-xs text-body">{n.phone_number_id}</span>,
    },
    {
      key: "nombre",
      header: "Nombre verificado",
      cell: (n) => <span className="text-body">{n.verified_name ?? "—"}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (n) => (
        <Badge
          variant={
            n.status === "CONNECTED" ? "success" : n.status === "VERIFIED" ? "accent" : "warning"
          }
        >
          {n.status}
        </Badge>
      ),
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (n) => (
        <div className="flex justify-end gap-2">
          {!n.registered && (
            <RegisterNumberDialog
              connectionId={connectionId}
              phoneNumberId={n.phone_number_id}
              label={n.display_phone_number ?? n.phone_number_id}
            />
          )}
          <NumberActions
            connectionId={connectionId}
            phoneNumberId={n.phone_number_id}
            label={n.display_phone_number ?? n.phone_number_id}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/conexiones/meta">← Volver</Link>
      </Button>

      <PageHeader
        title="Números"
        description="Números de la WABA. Agrégalos, verifícalos con el código de Meta y regístralos para enviar y recibir."
        actions={<AddNumberDialog connectionId={connectionId} />}
      />

      {sync_error && (
        <p role="status" className="text-sm text-warning">
          Aviso al sincronizar con Meta: {sync_error}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={numbers}
        getRowKey={(n) => n.id}
        emptyTitle="Sin números todavía"
        emptyDescription="Agrega el primero para empezar a enviar y recibir por WhatsApp."
      />
    </div>
  );
}
