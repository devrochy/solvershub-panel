import { ChecklistMeta } from "@/components/domain/checklist-meta";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";

export const metadata = { title: "Requisitos de Meta" };

type Checklist = {
  steps: { key: string; label: string; link: string; done: boolean; notes: string }[];
  checks: { key: string; ok: boolean; detail: string | null }[];
  meta_configured: boolean;
};

export default async function RequisitosPage() {
  const res = await apiFetch<Checklist>("/admin/meta/checklist/requirements");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar la checklist: {res.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Requisitos de Meta"
        description="Pasos manuales de la app de Meta y comprobaciones automáticas del negocio."
      />
      <ChecklistMeta checks={res.data.checks} kind="requirements" steps={res.data.steps} />
    </div>
  );
}
