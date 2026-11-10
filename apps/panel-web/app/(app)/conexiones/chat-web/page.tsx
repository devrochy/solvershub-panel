import { redirect } from "next/navigation";

import { WebChatForm } from "@/app/(app)/configuracion/_components/web-chat-form";
import { ErrorDeCarga } from "@/components/domain/error-de-carga";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { CatalogoConfig, Me, WebChatSettings } from "@/lib/api/types";
import { unicaDeTipo } from "@/lib/conexion-ficha";
import { cargarConsola } from "@/lib/conexion-ficha-servidor";
import { puedeEditarConfiguracion } from "@/lib/configuracion-secciones";

export const metadata = { title: "Chat web" };

/**
 * Alta del chat web desde «Agregar conexión» (HU-UX-09). La conexión `webchat` nace al guardar
 * el widget: si ya existe, su ficha; si no, el mismo formulario de Configuración → Chat web.
 */
export default async function ChatWebPage() {
  const consola = await cargarConsola();
  const existente = consola.ok ? unicaDeTipo(consola.data.items, "webchat") : null;
  if (existente) redirect(`/conexiones/${existente.id}/apariencia`);

  const [res, catalogoRes, meRes] = await Promise.all([
    apiFetch<WebChatSettings>("/admin/settings/web-chat"),
    apiFetch<CatalogoConfig>("/admin/settings/catalog"),
    apiFetch<Me>("/admin/me"),
  ]);
  if (!res.ok) {
    return <ErrorDeCarga titulo="No se pudo cargar el chat web" detalle={res.error} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Conectar el chat web"
        description="Actívalo, escribe los sitios donde aparece y guarda. Después copias el fragmento y lo pegas en tu sitio."
      />
      <WebChatForm
        webChat={res.data}
        catalogo={catalogoRes.ok ? catalogoRes.data : null}
        puedeEditar={meRes.ok && puedeEditarConfiguracion(meRes.data)}
      />
    </div>
  );
}
