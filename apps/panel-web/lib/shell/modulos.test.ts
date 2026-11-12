import { describe, expect, it } from "vitest";

import type { AgentOverviewItem } from "@/lib/api/types";

import {
  PACK_DEL_AGENTE,
  cuentaParaModulo,
  estadosDeModulos,
  moduloHabilitado,
  packsConAgente,
} from "./modulos";

function agente(extra: Partial<AgentOverviewItem>): AgentOverviewItem {
  return {
    id: "a-1",
    ref: "a-1",
    key: "ventas",
    name: "Ventas",
    kind: "specialist",
    status: "active",
    virtual: false,
    published: true,
    connections: [],
    incluye_sin_atribuir: false,
    turns: 0,
    conversations: 0,
    cost_usd: null,
    last_activity_at: null,
    ...extra,
  };
}

const PACKS = {
  pack_commerce: { enabled: true },
  pack_calendar: { enabled: true },
  pack_cobranza: { enabled: true },
};

describe("módulos del negocio", () => {
  it("mapea la clave de la plantilla a su pack (ADR-0139)", () => {
    expect(PACK_DEL_AGENTE).toMatchObject({
      ventas: "pack_commerce",
      agenda: "pack_calendar",
      cobranza: "pack_cobranza",
      suscripciones: "pack_subscriptions",
    });
  });

  it("cuenta especialistas y back-office publicados, no el Coordinador ni el General", () => {
    expect(cuentaParaModulo(agente({}))).toBe(true);
    expect(cuentaParaModulo(agente({ kind: "backoffice" }))).toBe(true);
    expect(cuentaParaModulo(agente({ published: false }))).toBe(false);
    expect(cuentaParaModulo(agente({ virtual: true }))).toBe(false);
    expect(cuentaParaModulo(agente({ kind: "core" }))).toBe(false);
    expect(cuentaParaModulo(agente({ key: "general" }))).toBe(false);
  });

  it("habilita el módulo con especialista publicado y pack encendido", () => {
    const estados = estadosDeModulos(PACKS, { items: [agente({})] });
    expect(estados.pack_commerce).toBe("habilitado");
    expect(estados.pack_calendar).toBe("plan");
    expect(estados.pack_cobranza).toBe("plan");
  });

  it("sin especialista, el módulo queda en plan aunque el pack esté encendido", () => {
    const estados = estadosDeModulos(PACKS, { items: [agente({ key: "general" })] });
    expect(estados.pack_commerce).toBe("plan");
  });

  it("con especialista pero pack apagado, el módulo queda en pack", () => {
    const estados = estadosDeModulos({ ...PACKS, pack_commerce: { enabled: false } }, { items: [agente({})] });
    expect(estados.pack_commerce).toBe("pack");
  });

  it("sin datos de agentes (sin permiso o consulta fallida) manda el pack", () => {
    const estados = estadosDeModulos({ ...PACKS, pack_cobranza: { enabled: false } }, null);
    expect(estados.pack_commerce).toBe("habilitado");
    expect(estados.pack_cobranza).toBe("pack");
  });

  it("devuelve los packs con agente publicado", () => {
    expect([...packsConAgente({ items: [agente({}), agente({ key: "agenda", ref: "a-2" })] })]).toEqual([
      "pack_commerce",
      "pack_calendar",
    ]);
  });

  it("una entrada sin pack siempre está habilitada", () => {
    expect(moduloHabilitado({ pack_commerce: "plan" }, undefined)).toBe(true);
    expect(moduloHabilitado({ pack_commerce: "plan" }, "pack_commerce")).toBe(false);
    expect(moduloHabilitado({ pack_commerce: "habilitado" }, "pack_commerce")).toBe(true);
  });
});
