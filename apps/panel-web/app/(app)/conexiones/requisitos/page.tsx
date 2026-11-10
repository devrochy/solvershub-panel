import { ChecklistMeta } from "@/components/domain/checklist-meta";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
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
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Requisitos de Meta"
        description="Lo que Meta pide antes de atender clientes reales por WhatsApp. Marca cada paso cuando lo termines."
      />
      {res.ok ? (
        <ChecklistMeta checks={res.data.checks} steps={res.data.steps} />
      ) : (
        <ErrorDeCarga titulo="No se pudieron cargar los requisitos" detalle={res.error} />
      )}
    </div>
  );
}
