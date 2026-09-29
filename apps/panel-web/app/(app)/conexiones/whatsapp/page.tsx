import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import { WhatsappWizard } from "./_components/whatsapp-wizard";

export const metadata = { title: "Conectar WhatsApp" };

type Estado = { meta_configured: boolean; app_id: string; config_id: string; environments: string[] };

export default async function ConectarWhatsappPage() {
  const res = await apiFetch<Estado>("/admin/meta/wizard");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        No se pudo cargar el wizard: {res.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conectar WhatsApp"
        description="Embedded Signup con la app del framework, BYOK con tu propia app o carga manual."
      />
      <WhatsappWizard estado={res.data} />
    </div>
  );
}
