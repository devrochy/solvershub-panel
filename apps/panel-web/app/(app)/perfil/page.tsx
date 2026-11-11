import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";

import { PerfilForm } from "./_components/perfil-form";

export const metadata = { title: "Perfil" };

/** Perfil propio (SPEC-34): datos, foto, usuario y contraseña. */
export default async function PerfilPage() {
  const res = await apiFetch<Me>("/admin/me");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Perfil"
        description="Tu cuenta: nombre, contacto, foto, usuario y contraseña."
        breadcrumbs={[{ label: "Cuenta" }, { label: "Perfil" }]}
      />
      {res.ok ? <PerfilForm me={res.data} /> : <ErrorDeCarga titulo="No pudimos cargar tu perfil" detalle={res.error} />}
    </div>
  );
}
