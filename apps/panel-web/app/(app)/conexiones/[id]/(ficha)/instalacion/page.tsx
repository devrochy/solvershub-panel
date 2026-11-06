import { InstalacionChatWeb } from "@/app/(app)/conexiones/_components/instalacion-chat-web";
import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { apiFetch } from "@/lib/api/server";
import type { WebChatSettings } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";

export const metadata = { title: "Instalación" };

/** Chat web: el fragmento para pegar en el sitio del negocio. */
export default async function InstalacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "instalacion");
  if (!ficha) return null;
  const res = await apiFetch<WebChatSettings>("/admin/settings/web-chat");

  return (
    <SeccionFicha titulo="Instalación" descripcion="Pega este fragmento en tu sitio y tus visitantes hablan con el mismo agente.">
      {res.ok ? (
        <InstalacionChatWeb snippet={res.data.snippet} />
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudo cargar el chat web: {res.error}
        </p>
      )}
    </SeccionFicha>
  );
}
