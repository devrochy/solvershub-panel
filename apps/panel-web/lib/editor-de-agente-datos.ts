import type { ComponentProps } from "react";

import type { EditorDeAgente } from "@/components/domain/agentes/recorrido/editor-de-agente";
import { flujoDesdeApi, negocioDesdeIdentidad } from "@/lib/agentes-editor";
import { nombresDeHabilidades } from "@/lib/agentes-ficha";
import { apiFetch } from "@/lib/api/server";
import type {
  AgentActionPage,
  AgentDetail,
  AgentFlowOptionsOut,
  AgentFlowOut,
  AgentRetiredNotices,
  LlmModelCatalog,
  Me,
  PluginSummary,
  PublishTargetPage,
  RequirementPage,
  SettingsResponse,
  SuperpowerPage,
} from "@/lib/api/types";
import { puedeEditarConfiguracion } from "@/lib/configuracion-secciones";
import type { AgenteDatos } from "@/lib/datos-cliente";

type PropsDelEditor = ComponentProps<typeof EditorDeAgente>;

/** Lo que el editor necesita de la API, sin el modo ni el paso con que abre. */
export type DatosDelEditor = Omit<PropsDelEditor, "modo" | "pasoInicial" | "bienvenida">;

export type CargaDelEditor =
  | { estado: "no_existe" }
  | { estado: "error"; detalle?: string }
  | { estado: "no_especialista"; nombre: string }
  | { estado: "ok"; nombre: string; datos: DatosDelEditor };

/**
 * Las lecturas del editor de un agente (HU-AOS-24, HU-AOS-78), para la página de Agentes y para la
 * bienvenida (HU-UX-23). Solo agente, superpoderes y modelos son obligatorias; lo demás abre vacío si no responde.
 */
export async function cargarEditorDeAgente(id: string): Promise<CargaDelEditor> {
  const [agente, superpoderes, modelos, destinos, me, requisitos, retiradas, plugins, acciones, datosCliente, flujo, opcionesDeFlujo, ajustes] =
    await Promise.all([
      apiFetch<AgentDetail>(`/admin/agents/${id}`),
      apiFetch<SuperpowerPage>(`/admin/agent-superpowers?agent_id=${id}&page_size=100`),
      // Con `agent_id`, el modelo con el que atenderá este agente (HU-AOS-79), para la línea de Publicar.
      apiFetch<LlmModelCatalog>(`/admin/agent-models?agent_id=${id}&page_size=100`),
      apiFetch<PublishTargetPage>(`/admin/agents/${id}/publish-targets?page_size=100`),
      apiFetch<Me>("/admin/me"),
      apiFetch<RequirementPage>(`/admin/agents/${id}/requirements?page_size=100`),
      // Aviso de referencias retiradas (HU-AOS-59): si no responde, el editor abre sin el aviso.
      apiFetch<AgentRetiredNotices>(`/admin/agents/${id}/retired-references`),
      // Nombre de la habilidad de cada superpoder (HU-UX-09); sin respuesta queda la etiqueta conocida.
      apiFetch<PluginSummary[]>("/admin/plugins"),
      // Grupo de cada acción (ADR-0190, agent-core#746); sin respuesta, Acciones agrupa por el nombre.
      apiFetch<AgentActionPage>(`/admin/agents/${id}/actions?page_size=100`),
      // Datos del cliente de ESTE agente (HU-CRM-28): la matriz y los datos de sus superpoderes.
      apiFetch<AgenteDatos>(`/admin/agents/${id}/datos-cliente`),
      // Flujo de atención por agente (ADR-0195, HU-AOS-76); sin respuesta, el paso abre vacío.
      apiFetch<AgentFlowOut>(`/admin/agents/${id}/flow`),
      apiFetch<AgentFlowOptionsOut>(`/admin/agents/${id}/flow/options`),
      // Voz, horario y reglas del negocio: se muestran en «Cómo habla» y «Horario y reglas».
      apiFetch<SettingsResponse>("/admin/settings"),
    ]);
  if (!agente.ok && agente.status === 404) return { estado: "no_existe" };
  if (!agente.ok || !superpoderes.ok || !modelos.ok) {
    const falla = [agente, superpoderes, modelos].find((r) => !r.ok);
    return { estado: "error", detalle: falla && !falla.ok ? falla.error : undefined };
  }
  if (agente.data.kind !== "specialist") return { estado: "no_especialista", nombre: agente.data.name };

  const nombre = nombresDeHabilidades(plugins.ok ? plugins.data : []);
  const puedeEditar = me.ok && puedeEditarConfiguracion(me.data);
  const efectivo = modelos.data.effective_model
    ? {
        nombre: modelos.data.effective_model,
        origen: modelos.data.effective_source === "agente" ? ("agente" as const) : ("negocio" as const),
      }
    : null;
  return {
    estado: "ok",
    nombre: agente.data.name,
    datos: {
      agente: agente.data,
      superpoderes: superpoderes.data.items,
      modelos: modelos.data,
      destinos: destinos.ok ? destinos.data.items : [],
      destinosError: destinos.ok ? null : destinos.error,
      puedeActivar: me.ok && (me.data.role === "master" || me.data.tenant?.role === "owner"),
      requisitos: requisitos.ok ? requisitos.data.items : [],
      avisosRetirados: retiradas.ok ? retiradas.data : null,
      nombresDeHabilidades: Object.fromEntries(superpoderes.data.items.map((p) => [p.skill, nombre(p.skill)])),
      gruposDeAcciones: acciones.ok ? Object.fromEntries(acciones.data.items.map((a) => [a.tool, a.group])) : {},
      datosCliente: datosCliente.ok ? datosCliente.data : null,
      datosClienteError: datosCliente.ok ? undefined : datosCliente.error,
      puedeEditarDatos: puedeEditar,
      flujoInicial: flujo.ok ? flujoDesdeApi(flujo.data.flow) : { sections: [] },
      flujoSeeded: flujo.ok ? flujo.data.seeded : false,
      accionesDelFlujo: opcionesDeFlujo.ok ? opcionesDeFlujo.data.actions : [],
      negocio: negocioDesdeIdentidad(me.ok ? (me.data.tenant?.name ?? "") : "", ajustes.ok ? ajustes.data.identity : null),
      modeloEfectivo: efectivo,
      puedeEditar,
    },
  };
}
