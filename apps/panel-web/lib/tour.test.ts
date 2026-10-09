import { describe, expect, it } from "vitest";

import {
  PASOS_DEL_TOUR,
  anuncioDelPaso,
  cookieDelTour,
  debeOfrecerTour,
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

  it("se ofrece solo en la primera visita y mientras queden pasos", () => {
    expect(debeOfrecerTour(undefined, true)).toBe(true);
    expect(debeOfrecerTour("valor-raro", true)).toBe(true);
    expect(debeOfrecerTour("saltado", true)).toBe(false);
    expect(debeOfrecerTour("completado", true)).toBe(false);
    expect(debeOfrecerTour(undefined, false)).toBe(false);
  });

  it("recuerda cómo terminó en una cookie de un año", () => {
    expect(cookieDelTour("saltado")).toBe("panel_tour=saltado; path=/; max-age=31536000; samesite=lax");
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
