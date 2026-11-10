import { describe, expect, it } from "vitest";

import {
  PASOS_DEL_TOUR,
  anuncioDelPaso,
  pasoAnterior,
  pasoSiguiente,
} from "./tour";

describe("recorrido guiado (HU-SH-06)", () => {
  it("tiene cinco pasos con título y texto", () => {
    expect(PASOS_DEL_TOUR).toHaveLength(5);
    for (const paso of PASOS_DEL_TOUR) {
      expect(paso.titulo.length).toBeGreaterThan(0);
      expect(paso.texto.length).toBeGreaterThan(0);
    }
    expect(new Set(PASOS_DEL_TOUR.map((p) => p.id)).size).toBe(5);
  });

  it("avanza, retrocede y termina después del último", () => {
    expect(pasoSiguiente(0, 5)).toBe(1);
    expect(pasoSiguiente(4, 5)).toBeNull();
    expect(pasoAnterior(0)).toBe(0);
    expect(pasoAnterior(3)).toBe(2);
  });

  it("anuncia el paso para el lector de pantalla", () => {
    expect(anuncioDelPaso(1, 5, "Conecta tu WhatsApp")).toBe("Paso 2 de 5: Conecta tu WhatsApp");
  });
});
