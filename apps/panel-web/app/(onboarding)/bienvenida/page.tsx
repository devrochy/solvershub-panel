import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/server";
import type { AgentTemplatePage, Me, PrimerosPasos, SettingsResponse } from "@/lib/api/types";
import { TIPOS_DE_NEGOCIO, type TipoDeNegocio } from "@/lib/onboarding";

import { RecorridoDeBienvenida } from "./_components/recorrido";

export const metadata = { title: "Primeros pasos" };

/**
 * Asistente de primer uso (HU-UX-21). Solo entra quien puede terminarlo (el dueño; el master también) y solo
 * si el recorrido es del negocio y no está completo; en cualquier otro caso se vuelve al Resumen.
 */
export default async function BienvenidaPage() {
  const [me, onboarding, ajustes, plantillas] = await Promise.all([
    apiFetch<Me>("/admin/me"),
    apiFetch<PrimerosPasos>("/admin/onboarding"),
    apiFetch<SettingsResponse>("/admin/settings"),
    apiFetch<AgentTemplatePage>("/admin/agent-templates?page_size=100"),
  ]);
  if (!me.ok) redirect(me.status === 401 ? "/api/session/cerrar" : "/login");
  if (!onboarding.ok || !ajustes.ok || !me.data.tenant) redirect("/dashboard");
  const recorrido = onboarding.data.recorrido;
  const puede = me.data.tenant.role === "owner" || me.data.role === "master";
  if (!recorrido.aplica || recorrido.estado === "completo" || !puede) redirect("/dashboard");

  // Tipos de negocio cuya plantilla de agente se puede ofrecer; si la lista no carga, no se bloquea ninguno.
  // Elegir un tipo activa sus habilidades (`will_enable`): ya no hay que activarlas antes. Solo queda fuera un
  // tipo que este servicio no trae.
  const listas = plantillas.ok ? new Set(plantillas.data.items.filter((p) => p.available).map((p) => p.key)) : null;
  const disponibles = listas ? TIPOS_DE_NEGOCIO.filter((t) => listas.has(t.id)).map((t) => t.id as TipoDeNegocio) : null;
  const habilitara: Partial<Record<TipoDeNegocio, string[]>> = plantillas.ok
    ? Object.fromEntries(
        TIPOS_DE_NEGOCIO.map((t) => [t.id, plantillas.data.items.find((p) => p.key === t.id)?.will_enable ?? []]),
      )
    : {};
  const contenido = onboarding.data.pasos.find((p) => p.tipo) ?? null;

  return (
    <RecorridoDeBienvenida
      negocioId={me.data.tenant.id}
      nombreDelNegocio={me.data.tenant.name}
      recorridoInicial={recorrido}
      identidad={ajustes.data.identity}
      contenido={contenido}
      disponibles={disponibles}
      habilitara={habilitara}
    />
  );
}
