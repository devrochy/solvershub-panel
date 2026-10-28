import { SettingsTabs } from "@/app/(app)/configuracion/_components/settings-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { puedeEditarDatosCliente, type PoliticaDatos } from "@/lib/datos-cliente";
import { apiFetch } from "@/lib/api/server";
import type {
  BajasSettings,
  CatalogoConfig,
  Me,
  WawebPolitica,
  MediaSettings,
  SettingsResponse,
  WebChatSettings,
} from "@/lib/api/types";

export const metadata = { title: "Configuración" };

// Fallback si el backend todavía no tiene los endpoints de multimedia: no se
// rompe toda la pantalla de Configuración en un despliegue desfasado.
const MEDIA_FALLBACK: MediaSettings = {
  audio: { enabled: false, provider: "", model: "", has_api_key: false, using_platform_key: false },
  vision: { enabled: false, mode: "describir", provider: "", model: "", has_api_key: false, using_platform_key: false },
  catalog: { audio: [], vision: [] },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const tab = (await searchParams).tab;
  const [res, advancedRes, webChatRes, mediaRes, catalogoRes, bajasRes, datosRes, meRes] = await Promise.all([
    apiFetch<SettingsResponse>("/admin/settings"),
    apiFetch<Parameters<typeof SettingsTabs>[0]["advanced"]>("/admin/settings/advanced"),
    apiFetch<WebChatSettings>("/admin/settings/web-chat"),
    apiFetch<Parameters<typeof SettingsTabs>[0]["media"]>("/admin/settings/media"),
    // Catálogo de opciones (SPEC-37): etiquetas, ayudas y rangos vienen del backend.
    apiFetch<CatalogoConfig>("/admin/settings/catalog"),
    apiFetch<BajasSettings>("/admin/settings/bajas"),
    // Qué datos del cliente pide cada acción del agente (HU-CRM-13).
    apiFetch<PoliticaDatos>("/admin/datos-cliente/politica"),
    apiFetch<Me>("/admin/me"),
  ]);
  if ((!res.ok && res.status === 403) || (!advancedRes.ok && advancedRes.status === 403)) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No tienes permiso para ver la configuración de este negocio. Pídele acceso a quien administra el negocio.
      </p>
    );
  }
  if (!res.ok || !advancedRes.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar la configuración:{" "}
        {res.ok ? (advancedRes as { error: string }).error : res.error}
      </p>
    );
  }

  // La política de WhatsApp Web solo la ve el master: el catálogo solo trae sus opciones para él.
  const esMaster = catalogoRes.ok && catalogoRes.data.opciones.some((o) => o.grupo === "whatsapp_web");
  const wawebRes = esMaster ? await apiFetch<WawebPolitica>("/admin/settings/whatsapp-web") : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Configuración"
        description="Identidad y comportamiento del agente de este negocio."
        helpSection="settings"
        />
      <SettingsTabs
        advanced={advancedRes.data}
        defaultTab={tab}
        settings={res.data}
        webChat={webChatRes.ok ? webChatRes.data : { enabled: false, key: "", allowed_origins: [], turnstile_configured: false, snippet: "" }}
        media={mediaRes.ok ? mediaRes.data : MEDIA_FALLBACK}
        catalogo={catalogoRes.ok ? catalogoRes.data : null}
        bajas={bajasRes.ok ? bajasRes.data : null}
        waweb={wawebRes?.ok ? wawebRes.data : null}
        datosCliente={{
          politica: datosRes.ok ? datosRes.data : null,
          error: datosRes.ok ? undefined : datosRes.error,
          puedeEditar: meRes.ok && puedeEditarDatosCliente(meRes.data),
        }}
      />
    </div>
  );
}
