import { describe, expect, it } from "vitest";

import { identidadConPausa, puedeEditarAsistente } from "./asistente";
import { ajustes } from "./testing/fixtures";

describe("identidadConPausa", () => {
  it("cambia solo bot_paused y conserva el resto de la identidad", () => {
    const pausada = { ...ajustes.identity, bot_paused: true, assistant_name: "Sofía" };
    const cuerpo = identidadConPausa(pausada, false);

    expect(cuerpo.bot_paused).toBe(false);
    expect(cuerpo.assistant_name).toBe("Sofía");
    expect(cuerpo.business_description).toBe(pausada.business_description);
    expect(cuerpo.persona_forbidden).toEqual(pausada.persona_forbidden);
  });

  it("no reenvía los campos de solo lectura", () => {
    const cuerpo = identidadConPausa(ajustes.identity, true);
    expect(cuerpo).not.toHaveProperty("available_guardrails");
    expect(cuerpo).not.toHaveProperty("brand_voice_warning");
  });
});

describe("puedeEditarAsistente", () => {
  it("solo con escritura en Configuración", () => {
    expect(puedeEditarAsistente({ settings: "write" })).toBe(true);
    expect(puedeEditarAsistente({ settings: "read" })).toBe(false);
    expect(puedeEditarAsistente({})).toBe(false);
    expect(puedeEditarAsistente(null)).toBe(false);
  });
});
