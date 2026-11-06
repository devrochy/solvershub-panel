import { SeccionFicha } from "@/app/(app)/conexiones/_components/seccion-ficha";
import { WebChatForm } from "@/app/(app)/configuracion/_components/web-chat-form";
import { apiFetch } from "@/lib/api/server";
import type { CatalogoConfig, Me, WebChatSettings } from "@/lib/api/types";
import { fichaDePestana } from "@/lib/conexion-ficha-servidor";
import { puedeEditarConfiguracion } from "@/lib/configuracion-secciones";

export const metadata = { title: "Apariencia" };

/** Chat web: activarlo, dominios permitidos y Turnstile (el mismo formulario de Configuración → Chat web). */
export default async function AparienciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ficha = await fichaDePestana(id, "apariencia");
  if (!ficha) return null;
  const [res, catalogoRes, meRes] = await Promise.all([
    apiFetch<WebChatSettings>("/admin/settings/web-chat"),
    apiFetch<CatalogoConfig>("/admin/settings/catalog"),
    apiFetch<Me>("/admin/me"),
  ]);
  const puedeEditar = meRes.ok && puedeEditarConfiguracion(meRes.data);

  return (
    <SeccionFicha
      titulo="Apariencia"
      descripcion="Dónde aparece el chat y cómo se protege. Es la misma configuración de Configuración → Chat web."
    >
      {res.ok ? (
        <WebChatForm
          webChat={res.data}
          catalogo={catalogoRes.ok ? catalogoRes.data : null}
          puedeEditar={puedeEditar}
          conFragmento={false}
        />
      ) : (
        <p role="alert" className="text-status-danger-fg">
          No se pudo cargar el chat web: {res.error}
        </p>
      )}
    </SeccionFicha>
  );
}
