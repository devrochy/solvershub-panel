import { CategoryDialog, DeleteCategoryButton } from "@/app/(app)/comercio/categorias/_components/category-dialog";
import { BinaryBadge } from "@/components/domain/status-badge";
import { DataTable, type Column } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Categorías" };

type Category = {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  active: boolean;
};

export default async function CategoriesPage() {
  const res = await apiFetch<Category[]>("/pack/commerce/categories");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudieron cargar las categorías: {res.error}
      </p>
    );
  }
  const byId = new Map(res.data.map((c) => [c.id, c.name]));

  const columns: Column<Category>[] = [
    { key: "nombre", header: "Categoría", cell: (c) => <span className="text-headline">{c.name}</span> },
    {
      key: "padre",
      header: "Padre",
      cell: (c) => <span className="text-body">{c.parent_id ? (byId.get(c.parent_id) ?? "—") : "—"}</span>,
    },
    {
      key: "orden",
      header: "Orden",
      align: "right",
      cell: (c) => <span className="text-body">{c.sort_order}</span>,
    },
    {
      key: "estado",
      header: "Estado",
      cell: (c) => <BinaryBadge active={c.active} activeLabel="Activa" inactiveLabel="Inactiva" />,
    },
    {
      key: "acciones",
      header: "Acciones",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <CategoryDialog category={c} categories={res.data} />
          <DeleteCategoryButton categoryId={c.id} label={c.name} />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Categorías"
        description="Árbol de categorías del catálogo (venta cruzada y filtros del agente)."
        actions={<CategoryDialog categories={res.data} />}
      />
      <DataTable
        columns={columns}
        rows={res.data}
        getRowKey={(c) => c.id}
        emptyTitle="Sin categorías"
        emptyDescription="Crea la primera para organizar el catálogo."
      />
    </div>
  );
}
