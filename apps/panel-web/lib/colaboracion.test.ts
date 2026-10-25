import { describe, expect, it } from "vitest";

import type { RoutePreview } from "@/lib/api/types";
import {
  advertenciasLegibles,
  ciclosDeHandoff,
  conModo,
  desdeEnlaces,
  explicarPrueba,
  hayCambios,
  mensajeDeError,
  paraGuardar,
  puedeEditarPermisos,
  tieneModo,
  type Permiso,
} from "@/lib/colaboracion";

// Permisos entre agentes (HU-AOS-26): edición, ciclos de «pasar la conversación» y «Probar una frase».

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const C = "00000000-0000-4000-8000-00000000000c";
const NOMBRES = { [A]: "Ventas", [B]: "Agenda", [C]: "Soporte" };

describe("edición de permisos", () => {
  it("activa y quita modos; un par sin modos desaparece", () => {
    let ps: Permiso[] = [];
    ps = conModo(ps, A, B, "query", true);
    ps = conModo(ps, A, B, "handoff", true);
    expect(ps).toEqual([{ from_agent_id: A, to_agent_id: B, modes: ["handoff", "query"], resto: undefined }]);
    expect(tieneModo(ps, A, B, "handoff") && !tieneModo(ps, B, A, "handoff")).toBe(true);
    ps = conModo(ps, A, B, "handoff", false);
    ps = conModo(ps, A, B, "query", false);
    expect(ps).toEqual([]);
  });

  it("al guardar conserva los demás campos del enlace (intenciones, límites)", () => {
    const ps = desdeEnlaces([
      {
        from_agent_id: A, to_agent_id: B, modes: ["query"], intents: ["stock"], max_depth: 2,
        timeout_ms: 15000, budget_usd: 0.01, budget_tokens: 100, data_classes: ["public"],
      },
    ]);
    const editados = conModo(ps, A, B, "delegate", true);
    expect(paraGuardar(editados)).toEqual([
      {
        intents: ["stock"], max_depth: 2, timeout_ms: 15000, budget_usd: 0.01, budget_tokens: 100,
        data_classes: ["public"], from_agent_id: A, to_agent_id: B, modes: ["delegate", "query"],
      },
    ]);
    expect(hayCambios(ps, editados)).toBe(true);
    expect(hayCambios(ps, conModo(editados, A, B, "delegate", false))).toBe(false);
  });
});

describe("ciclos de pasar la conversación", () => {
  it("avisa A → B → A y A → B → C → A una sola vez, con nombres", () => {
    let ps: Permiso[] = [];
    ps = conModo(ps, A, B, "handoff", true);
    expect(ciclosDeHandoff(ps, NOMBRES)).toEqual([]);
    ps = conModo(ps, B, A, "handoff", true);
    expect(ciclosDeHandoff(ps, NOMBRES)).toEqual(["Ventas → Agenda → Ventas"]);
    ps = conModo(ps, B, C, "handoff", true);
    ps = conModo(ps, C, A, "handoff", true);
    expect(ciclosDeHandoff(ps, NOMBRES)).toHaveLength(2);
  });

  it("encargar o consultar en ambos sentidos no es un ciclo", () => {
    let ps: Permiso[] = [];
    ps = conModo(ps, A, B, "query", true);
    ps = conModo(ps, B, A, "delegate", true);
    expect(ciclosDeHandoff(ps, NOMBRES)).toEqual([]);
  });

  it("traduce las advertencias del servidor", () => {
    expect(advertenciasLegibles([`ciclo_handoff:${A}>${B}`], NOMBRES)).toEqual(["Ventas → Agenda → Ventas"]);
  });
});

describe("permisos y errores", () => {
  it("edita el master o un negocio v3 con settings en escritura", () => {
    expect(puedeEditarPermisos({ role: "master" }, "legacy")).toBe(true);
    expect(puedeEditarPermisos({ role: "owner", permissions: { settings: "write" } }, "v3")).toBe(true);
    expect(puedeEditarPermisos({ role: "owner", permissions: { settings: "write" } }, "legacy")).toBe(false);
    expect(puedeEditarPermisos({ role: "colaborador", permissions: { settings: "read" } }, "v3")).toBe(false);
  });

  it("los códigos de la API tienen un mensaje claro", () => {
    expect(mensajeDeError("autollamada")).toMatch(/sí mismo/);
    expect(mensajeDeError("sin_release_activa")).toMatch(/versión activa/);
    expect(mensajeDeError(undefined, "otro")).toBe("otro");
  });
});

describe("probar una frase", () => {
  const base: RoutePreview = {
    mode: "active", source: "trigger", agent_key: "agenda", agent_id: B, procedure_id: "pack_calendar.agendar_cita",
    rule_id: null, confidence: 0.86, candidates: [{ procedure_id: "pack_calendar.agendar_cita", owner: "agenda", score: 0.86 }],
    not_evaluated_rules: [],
  };

  it("explica el disparador con su puntaje y el nombre del agente", () => {
    const e = explicarPrueba(base, { agenda: "Agenda" });
    expect(e.agente).toBe("Agenda");
    expect(e.porque).toMatch(/86 %/);
    expect(e.avisos).toEqual([]);
  });

  it("avisa si el enrutamiento está apagado o hay reglas que no se evalúan", () => {
    const e = explicarPrueba({ ...base, mode: "off", source: "default", candidates: [], not_evaluated_rules: ["vip"] }, {});
    expect(e.porque).toMatch(/agente por defecto/);
    expect(e.avisos.join(" ")).toMatch(/apagado/);
    expect(e.avisos.join(" ")).toMatch(/vip/);
    expect(explicarPrueba({ ...base, source: "rule", rule_id: "boton_plan" }, {}).porque).toMatch(/boton_plan/);
  });
});
