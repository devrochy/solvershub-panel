import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";
import { WhatsappWizard } from "./_components/whatsapp-wizard";

export const metadata = { title: "Conectar WhatsApp" };

type Estado = components["schemas"]["WizardState"];
type Sesion = components["schemas"]["WizardSessionOut"];

export default async function ConectarWhatsappPage() {
  const [res, sesionRes] = await Promise.all([
    apiFetch<Estado>("/admin/meta/wizard"),
    // En qué paso quedó el alta con Facebook (sin efectos): para reanudarla.
    apiFetch<Sesion | null>("/admin/meta/wizard/session?environment=production"),
  ]);
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el wizard: {res.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conectar WhatsApp"
        description="Conecta tu número con Facebook (producción), con tu propia app de Meta o con la carga manual."
      />
      <WhatsappWizard estado={res.data} sesion={sesionRes.ok ? (sesionRes.data ?? null) : null} />
    </div>
  );
}
