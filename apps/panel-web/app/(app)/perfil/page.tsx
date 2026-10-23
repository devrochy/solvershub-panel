import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { Me } from "@/lib/api/types";

import { PerfilForm } from "./_components/perfil-form";

export const metadata = { title: "Perfil" };

/** Perfil propio (SPEC-34): datos, foto, usuario y contraseña. */
export default async function PerfilPage() {
  const res = await apiFetch<Me>("/admin/me");
  if (!res.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar tu perfil: {res.error}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Perfil"
        description="Tu cuenta: nombre, contacto, foto, usuario y contraseña."
        breadcrumbs={[{ label: "Cuenta" }, { label: "Perfil" }]}
      />
      <PerfilForm me={res.data} />
    </div>
  );
}
