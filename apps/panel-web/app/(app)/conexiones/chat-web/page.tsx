import Link from "next/link";
import { redirect } from "next/navigation";

import { WebChatForm } from "@/app/(app)/configuracion/_components/web-chat-form";
import { Button } from "@/components/ui/button";
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
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar el chat web: {res.error}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link href="/conexiones">← Conexiones</Link>
      </Button>
      <PageHeader
        title="Conectar el chat web"
        description="Actívalo, define los dominios donde se puede incrustar y guarda: el fragmento para tu sitio aparece abajo."
      />
      <WebChatForm
        webChat={res.data}
        catalogo={catalogoRes.ok ? catalogoRes.data : null}
        puedeEditar={meRes.ok && puedeEditarConfiguracion(meRes.data)}
      />
    </div>
  );
}
