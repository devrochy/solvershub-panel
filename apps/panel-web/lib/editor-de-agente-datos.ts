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
  PlanResponse,
  PluginSummary,
  PublishTargetPage,
  RequirementPage,
  SettingsResponse,
  SuperpowerPage,
} from "@/lib/api/types";
import { puedeEditarConfiguracion } from "@/lib/configuracion-secciones";
import type { AvisoDatos } from "@/lib/aviso-datos";
import type { AgenteDatos } from "@/lib/datos-cliente";
import type { FormasDePago } from "@/lib/formas-de-pago";
import type { HorarioDelAgente } from "@/lib/horario-del-agente";
import type { ReglasDelAgente, ToolsHttpDelAgente } from "@/lib/reglas-y-tools-del-agente";
import { incluyeAvanzado } from "@/lib/nivel-ia";
import { funcionesDelPlanActual } from "@/lib/plan-limite";

type PropsDelEditor = ComponentProps<typeof EditorDeAgente>;

/** Lo que el editor necesita de la API, sin el modo ni el paso con que abre. */
export type DatosDelEditor = Omit<PropsDelEditor, "modo" | "pasoInicial" | "bienvenida">;

export type CargaDelEditor =
  | { estado: "no_existe" }
  | { estado: "error"; detalle?: string }
  | { estado: "no_especialista"; nombre: string; coordinador: boolean }
  | { estado: "ok"; nombre: string; datos: DatosDelEditor };

/**
 * Las lecturas del editor de un agente (HU-AOS-24, HU-AOS-78), para la página de Agentes y para la
 * bienvenida (HU-UX-23). Solo agente, superpoderes y modelos son obligatorias; lo demás abre vacío si no responde.
 */
export async function cargarEditorDeAgente(id: string): Promise<CargaDelEditor> {
  // Primero el agente: el Coordinador y el back-office no tienen superpoderes, modelos, flujo ni destinos propios
  // (esas rutas responden 404 o 500), así que no se piden. Con el Coordinador, Personalizar abre sus opciones (HU-AOS-98).
  const agente = await apiFetch<AgentDetail>(`/admin/agents/${id}`);
  if (!agente.ok && agente.status === 404) return { estado: "no_existe" };
  if (!agente.ok) return { estado: "error", detalle: agente.error };
  if (agente.data.kind !== "specialist") {
    return { estado: "no_especialista", nombre: agente.data.name, coordinador: agente.data.kind === "core" };
  }
  const [superpoderes, modelos, destinos, me, requisitos, retiradas, plugins, acciones, datosCliente, flujo, opcionesDeFlujo, ajustes, formas, horario, reglas, toolsHttp, aviso, plan] =
    await Promise.all([
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
      // Formas de pago (SPEC-48, HU-COM-21): 404 si el agente no tiene Comercio; entonces no se muestran.
      apiFetch<FormasDePago>(`/pack/commerce/agents/${id}/payment-forms`),
      // Horario propio del agente (HU-AOS-82); sin respuesta, el paso muestra solo el del negocio.
      apiFetch<HorarioDelAgente>(`/admin/agents/${id}/schedule`),
      // Reglas y tools HTTP del agente (HU-AOS-97); sin respuesta, esas secciones no se muestran.
      apiFetch<ReglasDelAgente>(`/admin/agents/${id}/guardrails`),
      apiFetch<ToolsHttpDelAgente>(`/admin/agents/${id}/declarative-tools`),
      // Aviso de tratamiento de datos del negocio (HU-CRM-16), en «Opciones avanzadas» de la estación 3 (HU-UX-29).
      apiFetch<AvisoDatos>("/admin/datos-cliente/aviso"),
      // El plan, para decir en la estación 5 si trae el nivel de IA Avanzado (HU-UX-31); sin respuesta no se dice.
      apiFetch<PlanResponse>("/admin/plan"),
    ]);
  if (!superpoderes.ok || !modelos.ok) {
    const falla = [superpoderes, modelos].find((r) => !r.ok);
    return { estado: "error", detalle: falla && !falla.ok ? falla.error : undefined };
  }

  const nombre = nombresDeHabilidades(plugins.ok ? plugins.data : []);
  const puedeEditar = me.ok && puedeEditarConfiguracion(me.data);
  // El modelo solo lo ve el master (ADR-0210 §5); al gestor la API ya lo manda vacío.
  const efectivo = me.ok && me.data.role === "master" && modelos.data.effective_model
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
      avisoDeDatos: aviso.ok ? aviso.data : null,
      formasDePago: formas.ok ? formas.data : null,
      horarioDelAgente: horario.ok ? horario.data : null,
      reglasDelAgente: reglas.ok ? reglas.data : null,
      toolsHttpDelAgente: toolsHttp.ok ? toolsHttp.data : null,
      flujoInicial: flujo.ok ? flujoDesdeApi(flujo.data.flow) : { sections: [] },
      flujoSeeded: flujo.ok ? flujo.data.seeded : false,
      accionesDelFlujo: opcionesDeFlujo.ok ? opcionesDeFlujo.data.actions : [],
      semillaDelFlujo: opcionesDeFlujo.ok ? flujoDesdeApi(opcionesDeFlujo.data.seed) : null,
      negocio: negocioDesdeIdentidad(me.ok ? (me.data.tenant?.name ?? "") : "", ajustes.ok ? ajustes.data.identity : null),
      modeloEfectivo: efectivo,
      incluyeAvanzado: incluyeAvanzado(funcionesDelPlanActual(plan.ok ? plan.data : null)),
      puedeEditar,
    },
  };
}
