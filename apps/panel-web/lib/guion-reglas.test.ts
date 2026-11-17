import { describe, expect, it } from "vitest";

import type { AccionDelFlujo, FlujoDelAgente } from "@/lib/agentes-editor";
import type { FormasDePago } from "@/lib/formas-de-pago";
import { componerGuion, estadosDeBloques, guionSugerido } from "@/lib/guion-reglas";

// SPEC-48, HU-COM-25: el guion se compone por las formas de pago activas.

type Estado = FormasDePago["forms"][number]["estado"];

function formas(t: Estado, l: Estado, comprobante = true): Pick<FormasDePago, "forms" | "transfer_proof_required"> {
  const f = (method: FormasDePago["forms"][number]["method"], estado: Estado) => ({
    method, label: method, enabled: estado !== "apagada", estado, falta: "", instructions: "", superpoder: null,
  });
  return { forms: [f("efectivo_contraentrega", "activa"), f("transferencia", t), f("pago_en_linea", l)], transfer_proof_required: comprobante };
}

const BASE: FlujoDelAgente = { sections: [{ id: "atender", label: "Atender", purpose: "Saludar", tools: ["consultar_inventario"] }] };
const ACCIONES: AccionDelFlujo[] = ["comprobar_comprobante", "confirmar_pago_pedido", "verificar_pago_pedido"].map((tool) => ({
  tool, group: "pagos", enabled: false, by_superpower: true,
}));

describe("reglas del guion", () => {
  it("solo contra entrega: sin bloque de comprobación", () => {
    const bloques = estadosDeBloques(formas("apagada", "apagada"), BASE);
    expect(bloques.map((b) => b.estado)).toEqual(["oculto", "oculto"]);
    expect(componerGuion(BASE, bloques, ACCIONES)).toEqual(BASE);
  });

  it("transferencia con comprobante agrega «Comprobar comprobante»; pago en línea, «Verificar pago»", () => {
    const bloques = estadosDeBloques(formas("activa", "activa"), BASE);
    const guion = componerGuion(BASE, bloques, ACCIONES);
    expect(guion.sections.map((s) => s.label)).toEqual(["Atender", "Comprobar comprobante", "Verificar pago"]);
    expect(guion.sections[1].tools).toEqual(["comprobar_comprobante"]);
  });

  it("sin comprobante o con algo por configurar, el bloque es opcional y no entra", () => {
    expect(estadosDeBloques(formas("activa", "apagada", false), BASE)[0].estado).toBe("opcional");
    const bloques = estadosDeBloques(formas("falta_configurar", "falta_configurar"), BASE);
    expect(bloques.map((b) => b.estado)).toEqual(["opcional", "opcional"]);
    expect(componerGuion(BASE, bloques, ACCIONES)).toEqual(BASE);
  });

  it("apagar una forma quita su bloque y respeta lo editado a mano", () => {
    const conPago = componerGuion(BASE, estadosDeBloques(formas("activa", "activa"), BASE), ACCIONES);
    const editado = { sections: [{ ...conPago.sections[0], purpose: "Mi saludo" }, ...conPago.sections.slice(1)] };
    const sinTransferencia = componerGuion(editado, estadosDeBloques(formas("apagada", "activa"), editado), ACCIONES);
    expect(sinTransferencia.sections.map((s) => s.id)).toEqual(["atender", "verificar_pago"]);
    expect(sinTransferencia.sections[0].purpose).toBe("Mi saludo");
  });

  it("una acción que el agente no tiene no entra al bloque", () => {
    const guion = componerGuion(BASE, estadosDeBloques(formas("activa", "apagada"), BASE), []);
    expect(guion.sections[1].tools).toEqual([]);
  });

  it("restaurar parte de la semilla con los bloques activos", () => {
    const editado = { sections: [{ id: "otra", label: "Otra", purpose: "", tools: [] }] };
    const bloques = estadosDeBloques(formas("activa", "apagada"), editado);
    expect(guionSugerido(BASE, bloques, ACCIONES).sections.map((s) => s.id)).toEqual(["atender", "comprobar_comprobante"]);
  });
});
