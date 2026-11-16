import { redirect } from "next/navigation";

import { apiFetch } from "@/lib/api/server";
import type { AgentTemplatePage, Me, PrimerosPasos, SettingsResponse } from "@/lib/api/types";
import { PASOS_DEL_NEGOCIO, TIPOS_DE_NEGOCIO, type TipoDeNegocio } from "@/lib/onboarding";

import { RecorridoDeBienvenida } from "./_components/recorrido";

export const metadata = { title: "Primeros pasos" };

/**
 * Asistente de primer uso (HU-UX-21, HU-UX-23). Solo entra quien puede terminarlo (el dueño; el master
 * también) y solo si el recorrido es del negocio y no está completo; en cualquier otro caso se vuelve al
 * Resumen. Aquí van los pasos 1 a 4; si el recorrido ya va del 5 en adelante y tiene agente, sigue en el
 * editor del agente (`/bienvenida/agente/[id]`). `?paso=` vuelve a uno de los cuatro primeros.
 */
export default async function BienvenidaPage({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  const { paso } = await searchParams;
  const pasoPedido = Number.parseInt(paso ?? "", 10);
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
  const pidioUnPasoDelNegocio = pasoPedido >= 1 && pasoPedido <= PASOS_DEL_NEGOCIO;
  if (!pidioUnPasoDelNegocio && recorrido.paso > PASOS_DEL_NEGOCIO && recorrido.agente_id) {
    redirect(`/bienvenida/agente/${recorrido.agente_id}`);
  }

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

  return (
    <RecorridoDeBienvenida
      negocioId={me.data.tenant.id}
      nombreDelNegocio={me.data.tenant.name}
      recorridoInicial={recorrido}
      identidad={ajustes.data.identity}
      pasoPedido={pidioUnPasoDelNegocio ? pasoPedido : undefined}
      disponibles={disponibles}
      habilitara={habilitara}
    />
  );
}
