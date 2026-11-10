import { Plus } from "lucide-react";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { TablaResponsiva } from "@/components/domain/tabla-responsiva";
import { StatusBadge } from "@/components/domain/status-badge";
import { ListPage } from "@/components/templates/list-page";
import { Button } from "@/components/ui/button";
import { type Column } from "@/components/ui/data-table";
import { apiFetch } from "@/lib/api/server";
import { GESTOR_STATUS } from "@/lib/cobranza/presentacion";
import {
  CollectorFormDialog,
  CollectorRowActions,
} from "../_components/collector-dialog";

export const metadata = { title: "Gestores" };

type Collector = {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  codigo: string | null;
  estatus: string;
};

export default async function GestoresPage() {
  const collectorsRes = await apiFetch<Collector[]>("/pack/cobranza/collectors");
  const nuevoGestor = (
    <CollectorFormDialog
      trigger={
        <Button variant="accent">
          <Plus className="h-4 w-4" aria-hidden /> Nuevo gestor
        </Button>
      }
    />
  );
  const header = { title: "Gestores", description: "Cobradores del negocio, sus datos y permisos.", actions: nuevoGestor };
  if (!collectorsRes.ok) {
    return (
      <ListPage header={header}>
        <ErrorDeCarga titulo="No se pudieron cargar los gestores" detalle={collectorsRes.error} />
      </ListPage>
    );
  }

  const columns: Column<Collector>[] = [
    { key: "nombre", header: "Gestor", cell: (g) => <span className="font-medium text-headline">{g.nombre}</span> },
    { key: "correo", header: "Correo", cell: (g) => <span className="text-body">{g.correo ?? "—"}</span> },
    { key: "telefono", header: "Teléfono", cell: (g) => <span className="whitespace-nowrap tabular-nums text-body">{g.telefono ?? "—"}</span> },
    { key: "estatus", header: "Estado", cell: (g) => <StatusBadge value={g.estatus} map={GESTOR_STATUS} /> },
    {
      key: "acciones",
      header: <span className="sr-only">Acciones</span>,
      align: "right",
      className: "w-10",
      cell: (g) => <CollectorRowActions collector={g} />,
    },
  ];

  return (
    <ListPage header={header}>
      <TablaResponsiva
        etiqueta="Gestores"
        columns={columns}
        rows={collectorsRes.data}
        getRowKey={(g) => g.id}
        emptyTitle="Sin gestores"
        emptyDescription="Crea el primer gestor con «Nuevo gestor»."
        filaCelular={(g) => ({
          titulo: g.nombre,
          detalle: [g.telefono, GESTOR_STATUS[g.estatus]?.label ?? g.estatus].filter(Boolean).join(" · "),
          accion: <CollectorRowActions collector={g} />,
        })}
      />
    </ListPage>
  );
}
