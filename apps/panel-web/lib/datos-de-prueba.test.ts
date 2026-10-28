import { describe, expect, it } from "vitest";

import { conteoLegible, resumenDelLote } from "./datos-de-prueba";

describe("datos de prueba por agente (HU-QA-10)", () => {
  it("cuenta lo principal en orden y omite el detalle", () => {
    expect(conteoLegible({ producto: 12, categoria: 3, variante: 14 })).toBe("12 productos y 3 categorías");
    expect(conteoLegible({ cartera: 1, cliente: 5, prestamo: 4, cuota: 60, pago: 12 })).toBe(
      "1 cartera, 5 clientes y 4 préstamos",
    );
    expect(conteoLegible({ tipo: 1, cita: 2 })).toBe("1 tipo de cita y 2 citas");
    expect(conteoLegible({ producto: 2, suscripcion: 4, cargo: 4 })).toBe(
      "2 productos, 4 suscripciones y 4 cargos",
    );
    expect(conteoLegible({ variante: 2 })).toBe("sin registros nuevos");
  });

  it("dice si los generó la IA o la plantilla y por qué", () => {
    expect(resumenDelLote({ conteos: { producto: 3 }, origen: "llm" })).toBe(
      "Listo: 3 productos, generados con IA según tu negocio.",
    );
    expect(resumenDelLote({ conteos: { tipo: 2 }, origen: "plantilla", motivo_plantilla: "formato" })).toContain(
      "la IA no devolvió datos válidos",
    );
    expect(resumenDelLote({ conteos: { tipo: 2 }, origen: "plantilla", motivo_plantilla: "proveedor" })).toContain(
      "la IA no respondió",
    );
  });
});
