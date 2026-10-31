import { describe, expect, it } from "vitest";

import { diasValidos, etiquetaDeDias, rangoDePeriodo, versusDeDias } from "./periodos";

describe("ventanas del Resumen (ADR-0171)", () => {
  it("solo acepta 7, 15 o 30 y cae en 7", () => {
    expect([diasValidos("7"), diasValidos("15"), diasValidos("30")]).toEqual([7, 15, 30]);
    expect(diasValidos("8")).toBe(7);
    expect(diasValidos(undefined)).toBe(7);
    expect(diasValidos("cualquiera")).toBe(7);
  });

  it("escribe las etiquetas y el versus en español", () => {
    expect(etiquetaDeDias(15)).toBe("15 días");
    expect(versusDeDias(30)).toBe("los 30 días anteriores");
  });

  it("formatea el rango de fechas corto", () => {
    const texto = rangoDePeriodo({ desde: "2026-10-20T12:00:00Z", hasta: "2026-10-27T12:00:00Z" });
    expect(texto).toMatch(/20.*oct.*27.*oct/);
  });
});
