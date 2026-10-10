import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ChecklistProduccion } from "@/components/domain/checklist-produccion";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { PlatformMetaApp } from "@/lib/api/types";

export const metadata = { title: "App de Meta" };

/**
 * "Plataforma → App de Meta" (solo master, HU-CONN-07): la app de la plataforma y la infraestructura.
 * Los requisitos de Meta para Embedded Signup (HU-SH-05) se enlazan desde aquí y usan esta revisión.
 */
export default async function AppDeMetaPage() {
  const res = await apiFetch<PlatformMetaApp>("/admin/platform/meta-app");
  if (!res.ok) {
    return (
      <p role="alert" className="text-danger">
        {res.status === 403 ? "Solo el admin de plataforma puede ver esto." : `Error: ${res.error}`}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="App de Meta"
        description="Chequeos de la app de Meta de la plataforma y de la infraestructura. Corren en segundo plano y queda guardado el último resultado."
      />
      <p className="text-sm text-body">
        App de la plataforma:{" "}
        <span className="font-mono text-xs">{res.data.meta_app_id || "sin configurar"}</span>
      </p>
      <ChecklistProduccion endpoint="/api/platform/meta-app" initial={res.data} />
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5 text-sm">
          <span className="flex flex-col gap-0.5">
            <span className="font-medium text-headline">Requisitos de Embedded Signup</span>
            <span className="text-xs text-body">
              Lo que Meta tiene que aprobar (verificación del negocio, Tech Provider, App Review, modo Live…)
              para que los negocios conecten su WhatsApp con Facebook. Quedan listos con esta revisión en verde.
            </span>
          </span>
          <Link
            className="inline-flex items-center gap-1 text-sm text-accent underline-offset-2 hover:underline"
            href="/plataforma/meta/embedded-signup"
          >
            Ver requisitos <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
