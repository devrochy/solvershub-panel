import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
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
  if (!collectorsRes.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudieron cargar los gestores: {collectorsRes.error}
      </p>
    );
  }
  const collectors = collectorsRes.data;

  const columns: Column<Collector>[] = [
    { key: "nombre", header: "Gestor", cell: (g) => <span className="text-headline">{g.nombre}</span> },
    { key: "correo", header: "Correo", cell: (g) => <span className="text-body">{g.correo ?? "—"}</span> },
    { key: "telefono", header: "Teléfono", cell: (g) => <span className="text-body">{g.telefono ?? "—"}</span> },
    {
      key: "estatus",
      header: "Estado",
      cell: (g) => <Badge variant={g.estatus === "activo" ? "success" : "neutral"}>{g.estatus}</Badge>,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (g) => <CollectorRowActions collector={g} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Gestores"
        description="Cobradores del negocio, sus datos y permisos (habilidad Cobranza)."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/cobranza">← Volver a Cobranza</Link>
          </Button>
        }
      />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-headline">Lista de gestores</h2>
          <CollectorFormDialog
            trigger={
              <Button variant="accent">
                <Plus className="h-4 w-4" aria-hidden /> Nuevo gestor
              </Button>
            }
          />
        </div>
        <DataTable
          columns={columns}
          rows={collectors}
          getRowKey={(g) => g.id}
          emptyTitle="Sin gestores"
          emptyDescription="Crea el primer gestor con el botón «Nuevo gestor»."
        />
      </section>
    </div>
  );
}
