import { describe, expect, it } from "vitest";

import { cuerpoIdentidad, puedeEditarAsistente } from "./asistente";
import { ajustes } from "./testing/fixtures";

describe("cuerpoIdentidad", () => {
  it("no manda bot_paused si el usuario no movió el interruptor", () => {
    const inicial = { ...ajustes.identity, bot_paused: false };
    const cuerpo = cuerpoIdentidad({ ...inicial, assistant_name: "Sofía" }, inicial);

    expect(cuerpo).not.toHaveProperty("bot_paused");
    expect(cuerpo.assistant_name).toBe("Sofía");
  });

  it("manda bot_paused cuando el usuario lo cambió", () => {
    const inicial = { ...ajustes.identity, bot_paused: false };
    expect(cuerpoIdentidad({ ...inicial, bot_paused: true }, inicial)).toMatchObject({ bot_paused: true });
  });

  it("usa la zona del negocio para el horario de atención", () => {
    const inicial = { ...ajustes.identity, timezone: "America/Lima", business_tz: "" };
    expect(cuerpoIdentidad(inicial, inicial).business_tz).toBe("America/Lima");
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
