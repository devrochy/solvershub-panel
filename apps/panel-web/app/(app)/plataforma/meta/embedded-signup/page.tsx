import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

import { RequisitosEmbeddedSignup } from "./_components/requisitos-embedded-signup";

export const metadata = { title: "Embedded Signup" };

type Requisitos = components["schemas"]["EmbeddedSignupRequirements"];

/**
 * "Plataforma → App de Meta → Embedded Signup" (solo master, HU-SH-05): lo que Meta tiene que
 * aprobar para que los negocios conecten su WhatsApp con Facebook. Los chequeos de
 * infraestructura de la app están en "App de Meta" (HU-CONN-07).
 */
export default async function EmbeddedSignupPage() {
  const res = await apiFetch<Requisitos>("/admin/platform/meta-app/embedded-signup");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        {res.status === 403 ? "Solo el admin de plataforma puede ver esto." : `Error: ${res.error}`}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Embedded Signup"
        description="Requisitos de Meta de la app de la plataforma para que los negocios conecten su WhatsApp con Facebook."
      />
      <RequisitosEmbeddedSignup inicial={res.data} />
    </div>
  );
}
