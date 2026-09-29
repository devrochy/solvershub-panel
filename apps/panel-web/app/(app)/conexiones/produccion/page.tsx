import { ChecklistMeta } from "@/components/domain/checklist-meta";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Producción" };

type Checklist = {
  steps: { key: string; label: string; link: string; done: boolean; notes: string }[];
};

export default async function ProduccionPage() {
  const res = await apiFetch<Checklist>("/admin/meta/checklist/production");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar la lista de producción: {res.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Producción"
        description="Checklist para dejar la integración de Meta lista para producción."
      />
      <ChecklistMeta kind="production" steps={res.data.steps} />
    </div>
  );
}
