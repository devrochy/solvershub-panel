import Link from "next/link";
import { notFound } from "next/navigation";

import { AllyDialog, DeleteAllyButton } from "@/app/(app)/comercio/aliados/_components/ally-dialog";
import { ListPage } from "@/components/templates/list-page";
import { BinaryBadge } from "@/components/domain/status-badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { contactoEnUnaLinea, type Aliado, type ModulosComercio } from "@/lib/aliados";
import { formatNumber } from "@/lib/format";

export const metadata = { title: "Aliados" };

export default async function AlliesPage() {
  // Con los aliados apagados para el negocio, la sección no existe (HU-CRM-03).
  const modulos = await apiFetch<ModulosComercio>("/pack/commerce/modulos");
  if (!modulos.ok || !modulos.data.aliados) notFound();

  const res = await apiFetch<Aliado[]>("/pack/commerce/allies");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar los aliados: {res.error}
      </p>
    );
  }

  const columns: Column<Aliado>[] = [
    { key: "nombre", header: "Aliado", cell: (a) => <span className="text-headline">{a.name}</span> },
    {
      key: "contacto",
      header: "Contacto",
      cell: (a) => <span className="text-body">{contactoEnUnaLinea(a.contact_info)}</span>,
    },
    {
      key: "productos",
      header: "Productos",
      align: "right",
      cell: (a) => (
        <Link href={`/comercio/productos?aliado=${a.id}`} className="text-link hover:underline">
          {formatNumber(a.products)}
        </Link>
      ),
    },
    {
      key: "estado",
      header: "Estado",
      cell: (a) => <BinaryBadge active={a.active} activeLabel="Activo" inactiveLabel="Inactivo" />,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (a) => (
        <div className="flex items-center justify-end gap-1">
          <AllyDialog ally={a} />
          <DeleteAllyButton ally={a} />
        </div>
      ),
    },
  ];

  return (
    <ListPage
      header={{
        title: "Aliados",
        description: "Proveedores cuyos productos vendes. Asígnalos en Productos o en el CSV y úsalos para limitar promociones.",
        actions: <AllyDialog />,
      }}
    >
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(a) => a.id}
        emptyTitle="Sin aliados"
        emptyDescription="Crea el primero y asígnale sus productos."
      />
    </ListPage>
  );
}
