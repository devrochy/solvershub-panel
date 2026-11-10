import Link from "next/link";

import { AddNumberDialog } from "@/app/(app)/conexiones/_components/meta/numeros/add-number-dialog";
import { MenuNumero } from "@/app/(app)/conexiones/_components/meta/numeros/number-actions";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { estadoNumeroMetaLabel } from "@/lib/labels";

export const metadata = { title: "Números" };

type PhoneNumberItem = {
  id: string;
  phone_number_id: string;
  display_phone_number: string | null;
  verified_name: string | null;
  status: string;
  registered: boolean;
};

/** Un número sin registrar no envía ni recibe: eso pesa más que su estado en Meta. */
function estadoDelNumero(n: PhoneNumberItem): { label: string; tono: "success" | "warning" | "neutral" } {
  if (!n.registered) return { label: "Falta registrarlo", tono: "warning" };
  if (n.status === "CONNECTED") return { label: estadoNumeroMetaLabel(n.status), tono: "success" };
  return { label: estadoNumeroMetaLabel(n.status), tono: n.status === "PENDING" ? "warning" : "neutral" };
}

/**
 * Números de la cuenta de WhatsApp Business (rediseñada en CON-13): el número, el nombre que ven
 * los clientes y un solo estado en palabras; verificar y registrar van en el menú de la fila. El
 * identificador de Meta no se muestra.
 */
export default async function NumbersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "numeros");
  const connectionId = ficha?.conexion.meta_connection_id;
  if (!connectionId) return null;
  const puedeEditar = ficha.consola.can_edit;
  const res = await apiFetch<{ numbers: PhoneNumberItem[]; sync_error: string | null }>(
    `/admin/meta/connections/${connectionId}/numbers`,
  );
  if (!res.ok) {
    return (
      <SeccionFicha titulo="Números">
        <ErrorDeCarga titulo="No se pudieron cargar los números" detalle={res.error} />
      </SeccionFicha>
    );
  }
  const { numbers, sync_error } = res.data;
  const etiqueta = (n: PhoneNumberItem) => n.display_phone_number ?? "Número sin mostrar";
  const menu = (n: PhoneNumberItem) =>
    puedeEditar ? (
      <MenuNumero connectionId={connectionId} phoneNumberId={n.phone_number_id} label={etiqueta(n)} registrado={n.registered} />
    ) : null;

  const columns: Column<PhoneNumberItem>[] = [
    { key: "numero", header: "Número", cell: (n) => <span className="font-medium tabular-nums text-headline">{etiqueta(n)}</span> },
    { key: "nombre", header: "Nombre que ven tus clientes", cell: (n) => <span className="text-body">{n.verified_name ?? "—"}</span> },
    {
      key: "estado",
      header: "Estado",
      cell: (n) => {
        const e = estadoDelNumero(n);
        return <Badge variant={e.tono}>{e.label}</Badge>;
      },
    },
    { key: "acciones", header: <span className="sr-only">Acciones</span>, align: "right", className: "w-10", cell: menu },
  ];

  return (
    <SeccionFicha
      titulo="Números"
      descripcion="Los números de tu cuenta de WhatsApp Business. Cada uno se verifica con un código de Meta y se registra para enviar y recibir."
      acciones={
        <>
          <Button asChild variant="ghost">
            <Link href={`/conexiones/${id}/numeros/negocio`}>Todos los números en Meta</Link>
          </Button>
          {puedeEditar && <AddNumberDialog connectionId={connectionId} />}
        </>
      }
    >
      {sync_error && (
        <p role="status" className="rounded-md border border-status-warning-border bg-status-warning-bg px-4 py-3 text-sm text-headline">
          Meta respondió con un aviso al leer los números: {sync_error}
        </p>
      )}

      <TablaResponsiva
        etiqueta="Números de WhatsApp"
        columns={columns}
        rows={numbers}
        getRowKey={(n) => n.id}
        emptyTitle="Todavía no hay números"
        emptyDescription="Agrega el primero para que tu agente atienda por WhatsApp."
        filaCelular={(n) => ({
          titulo: etiqueta(n),
          detalle: `${estadoDelNumero(n).label}${n.verified_name ? ` · ${n.verified_name}` : ""}`,
          accion: menu(n),
        })}
      />
    </SeccionFicha>
  );
}
