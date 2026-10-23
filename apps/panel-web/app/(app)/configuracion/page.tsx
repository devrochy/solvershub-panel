import { SettingsTabs } from "@/app/(app)/configuracion/_components/settings-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { apiFetch } from "@/lib/api/server";
import type { MediaSettings, SettingsResponse, WebChatSettings } from "@/lib/api/types";

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
  const [res, advancedRes, webChatRes, mediaRes] = await Promise.all([
    apiFetch<SettingsResponse>("/admin/settings"),
    apiFetch<Parameters<typeof SettingsTabs>[0]["advanced"]>("/admin/settings/advanced"),
    apiFetch<WebChatSettings>("/admin/settings/web-chat"),
    apiFetch<Parameters<typeof SettingsTabs>[0]["media"]>("/admin/settings/media"),
  ]);
  if (!res.ok || !advancedRes.ok) {
    return (
      <p role="alert" className="text-status-danger-fg">
        No se pudo cargar la configuración:{" "}
        {res.ok ? (advancedRes as { error: string }).error : res.error}
      </p>
    );
  }

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
      />
    </div>
  );
}
