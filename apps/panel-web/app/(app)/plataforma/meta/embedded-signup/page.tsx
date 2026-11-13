import { redirect } from "next/navigation";

import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { components } from "@/lib/api/schema";

import { RequisitosEmbeddedSignup } from "./_components/requisitos-embedded-signup";

export const metadata = { title: "Embedded Signup" };

type Requisitos = components["schemas"]["EmbeddedSignupRequirements"];

/**
 * "Plataforma → App de Meta → Embedded Signup" (solo master, HU-SH-05, PLT-08): lo que Meta tiene
 * que aprobar para que los negocios conecten su WhatsApp con Facebook.
 */
export default async function EmbeddedSignupPage() {
  const res = await apiFetch<Requisitos>("/admin/platform/meta-app/embedded-signup");
  if (!res.ok && res.status === 403) redirect("/dashboard");
  const header = (
    <PageHeader title="Embedded Signup" description="Lo que Meta tiene que aprobar para que los negocios conecten su WhatsApp con Facebook." helpSection="meta_app" />
  );
  if (!res.ok) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <ErrorDeCarga titulo="No pudimos cargar los requisitos" detalle={res.error} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {header}
      <RequisitosEmbeddedSignup inicial={res.data} />
    </div>
  );
}
