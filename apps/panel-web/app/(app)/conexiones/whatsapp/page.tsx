import { ErrorDeCarga } from "@/components/domain/error-de-carga";
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
    return <ErrorDeCarga titulo="No se pudo preparar la conexión de WhatsApp" detalle={res.error} />;
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conectar WhatsApp"
        description="Conecta el número de tu negocio para que tu agente atienda por WhatsApp."
      />
      <WhatsappWizard estado={res.data} sesion={sesionRes.ok ? (sesionRes.data ?? null) : null} />
    </div>
  );
}
