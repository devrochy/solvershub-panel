import { describe, expect, it } from "vitest";

import { categoriaDeMeta, cuandoFueCosto, paisDeMeta } from "@/lib/costos";

describe("costos técnicos en palabras (CYP-09 y 10)", () => {
  it("las categorías de Meta en español y el país con su nombre", () => {
    expect(categoriaDeMeta("utility")).toBe("Utilidad (avisos y confirmaciones)");
    expect(categoriaDeMeta("SERVICE")).toBe("Servicio (respuestas dentro de 24 h)");
    expect(categoriaDeMeta("nueva_categoria")).toBe("Nueva categoria");
    expect(paisDeMeta("CO")).toBe("Colombia");
    expect(paisDeMeta("")).toBe("Sin país");
  });

  it("las conversaciones por cuándo fueron", () => {
    const ahora = new Date(2026, 10, 10, 18);
    expect(cuandoFueCosto(new Date(2026, 10, 10, 9).toISOString(), ahora)).toBe("Conversación de hoy");
    expect(cuandoFueCosto(new Date(2026, 10, 9, 9).toISOString(), ahora)).toBe("Conversación de ayer");
    expect(cuandoFueCosto(new Date(2026, 10, 7, 9).toISOString(), ahora)).toBe("Hace 3 días");
    expect(cuandoFueCosto(new Date(2026, 9, 20, 9).toISOString(), ahora)).toMatch(/^Conversación del 20 de oct/);
    expect(cuandoFueCosto(null, ahora)).toBe("Conversación sin fecha");
  });
});
