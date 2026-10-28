import { describe, expect, it } from "vitest";

import type { InProgressTask, TurnDetail, TurnStep } from "@/lib/api/types";
import {
  huboTraspaso,
  humanizar,
  resultadoDePaso,
  resumenDelTurno,
  textoDeEvento,
  textoDeFalta,
  textoSinFaltas,
  tituloDePaso,
  valorDeDato,
} from "@/lib/turno";

// Depurador del turno y «En curso» (HU-AOS-28): textos claros, nunca códigos crudos.

const agente = (id: string, name: string) => ({ instance_id: id, name });

function turno(extra: Partial<TurnDetail> = {}): TurnDetail {
  return {
    turn_id: "t", conversation_id: "c", connection_id: "x", at: "2026-10-26T12:00:00Z", latency_ms: 1200,
    release_id: "r", release_number: 3, lane: "canary", inbound_message_ids: [],
    decision: {
      outcome: "routed", blocked_by: null, route_source: "rule", rule_id: null, candidates: [], confidence: 0.9,
      active_agent: agente("a", "Ventas"), final_agent: agente("a", "Ventas"),
    },
    status: "replied", verifier: [], verifier_retries: 0, steps: [], task_events: [], a2a: [], delivery: [], cost: [],
    can_see_detail: true, can_see_costs: true, ...extra,
  } as TurnDetail;
}

const paso = (extra: Partial<TurnStep>): TurnStep => ({
  at: "2026-10-26T12:00:00Z", kind: "action", actor: "tool:crear_pedido", name: "crear_pedido", action: "execute",
  input: null, output: null, detail_hidden: false, ok: null, error_codes: [], ...extra,
});

describe("turno", () => {
  it("humaniza ids de procedimientos y acciones", () => {
    expect(humanizar("pack_commerce.contratar_plan")).toBe("contratar plan");
    expect(humanizar("crear_pedido")).toBe("crear pedido");
  });

  it("resume quién atendió, con qué versión y cuánto tardó", () => {
    expect(resumenDelTurno(turno())).toMatch(/^Respondió · Ventas · versión 3 \(versión en prueba\) · /);
    expect(resumenDelTurno(turno({ release_number: null, lane: "legacy", status: null }))).toMatch(/Atendió el turno · Ventas · modo anterior/);
  });

  it("detecta el traspaso entre agentes", () => {
    expect(huboTraspaso(turno())).toBe(false);
    expect(huboTraspaso(turno({ decision: { ...turno().decision, final_agent: agente("b", "Agenda") } }))).toBe(true);
  });

  it("titula los pasos y su resultado sin valores", () => {
    expect(tituloDePaso(paso({}))).toBe("Acción crear pedido: se ejecutó");
    expect(tituloDePaso(paso({ kind: "command", actor: "core:comando", name: "comando", action: "actualizar_tarea" }))).toBe(
      "Comando del agente: actualizar tarea",
    );
    expect(resultadoDePaso(paso({ ok: false, error_codes: ["sin_stock"] }))).toEqual({ texto: "Falló: sin stock", tono: "danger" });
    expect(resultadoDePaso(paso({ ok: true }))?.tono).toBe("success");
    expect(resultadoDePaso(paso({}))).toBeNull();
  });

  it("cuenta los eventos de tarea, incluida la toma humana", () => {
    const e = { at: "x", task_id: "k", procedure_id: "p", seq: 2, actor: "human", data: {} };
    expect(textoDeEvento({ ...e, type: "taken" })).toBe("Una persona la tomó");
    expect(textoDeEvento({ ...e, type: "slot_set", data: { slot: "email" } })).toBe("Guardó un dato: email");
    expect(textoDeEvento({ ...e, type: "algo_nuevo" })).toBe("algo nuevo");
  });
});

describe("en curso", () => {
  const tarea = (extra: Partial<InProgressTask> = {}): InProgressTask => ({
    task_id: "k", procedure_id: "p", title: "Contratar un plan", status: "active", status_reason: null, stage: "datos",
    in_focus: true, data: [], missing: [], pending_confirmation: false, last_action: null, missing_reason: null, ...extra,
  });

  it("dice qué falta en lenguaje claro", () => {
    expect(textoDeFalta({ kind: "dato_cliente", name: "email", label: "Correo" })).toBe("Falta: Correo");
    expect(textoDeFalta({ kind: "confirmar_dato", name: "email", label: "Correo" })).toBe("Falta confirmar: Correo");
    expect(textoDeFalta({ kind: "confirmar_etapa", name: "confirmar", label: "confirmar" })).toMatch(/confirme este paso/);
  });

  it("sin lista: la versión no está o no falta nada", () => {
    expect(textoSinFaltas(tarea({ missing_reason: "definicion_no_disponible" }))).toMatch(/no está disponible/);
    expect(textoSinFaltas(tarea({ pending_confirmation: true }))).toMatch(/confirme/);
    expect(textoSinFaltas(tarea())).toMatch(/No falta nada/);
  });

  it("muestra los valores sin romper", () => {
    expect([valorDeDato(null), valorDeDato("•••"), valorDeDato(3), valorDeDato({ a: 1 })]).toEqual(["—", "•••", "3", '{"a":1}']);
  });
});
