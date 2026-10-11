"use client";

import { useState } from "react";

import { AccesibilidadPanel } from "@/app/(app)/configuracion/_components/accesibilidad-panel";
import { AdvancedPanel } from "@/app/(app)/configuracion/_components/advanced-panel";
import { BrainForm } from "@/app/(app)/configuracion/_components/brain-form";
import { IdentityForm } from "@/app/(app)/configuracion/_components/identity-form";
import { MemoryForm } from "@/app/(app)/configuracion/_components/memory-form";
import { SkillsForm } from "@/app/(app)/configuracion/_components/skills-form";
import { WebChatForm } from "@/app/(app)/configuracion/_components/web-chat-form";
import { Tabs } from "@/components/ui/tabs";
import type { SettingsResponse, WebChatSettings } from "@/lib/api/types";

type Advanced = {
  versions: { id: string; version: string; is_active: boolean; created_at: string | null }[];
  llm: { llm_provider: string; llm_model: string; has_api_key: boolean };
  guardrails_text: string;
  flow: { source: string; sections: { label: string; purpose: string | null; tools: string[] }[]; unknown_tools: string[] };
  eval_runs: { id: string; status: string; score: number | null; created_at: string | null }[];
  spec: Record<string, unknown>;
};

// Alias de las pestañas del panel clásico → ids de esta pantalla (para ?tab=).
const ALIAS_TABS: Record<string, string> = {
  identidad: "identity",
  cerebro: "brain",
  memoria: "memory",
  habilidades: "skills",
  avanzado: "advanced",
  "chat-web": "web-chat",
  accesibilidad: "a11y",
};

const TABS = [
  { id: "identity", label: "Identidad" },
  { id: "brain", label: "Cerebro" },
  { id: "memory", label: "Memoria" },
  { id: "skills", label: "Habilidades" },
  { id: "web-chat", label: "Chat web" },
  { id: "advanced", label: "Avanzado" },
  { id: "a11y", label: "Accesibilidad" },
];

/** Shell de Configuración: elige la pestaña activa y monta su formulario. */
export function SettingsTabs({
  defaultTab,
  settings,
  webChat,
  advanced,
}: {
  defaultTab?: string;
  settings: SettingsResponse;
  webChat: WebChatSettings;
  advanced: Advanced;
}) {
  const pedido = defaultTab ? (ALIAS_TABS[defaultTab] ?? defaultTab) : "";
  const [tab, setTab] = useState(
    TABS.some((t) => t.id === pedido) ? pedido : "identity");

  return (
    <div className="flex flex-col gap-6">
      <Tabs items={TABS} value={tab} onValueChange={setTab} />
      {tab === "identity" && <IdentityForm identity={settings.identity} />}
      {tab === "brain" && <BrainForm brain={settings.brain} />}
      {tab === "memory" && <MemoryForm memory={settings.memory} />}
      {tab === "skills" && <SkillsForm skills={settings.skills} />}
      {tab === "web-chat" && <WebChatForm webChat={webChat} />}
      {tab === "advanced" && <AdvancedPanel advanced={advanced} />}
      {tab === "a11y" && <AccesibilidadPanel />}
    </div>
  );
}
