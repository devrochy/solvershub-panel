import { describe, expect, it } from "vitest";

import { ayudaFueraDeHorario, cuerpoIdentidad, puedeEditarAsistente } from "./asistente";
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

  it("no manda el aviso por defecto, que es de solo lectura", () => {
    const inicial = ajustes.identity;
    expect(cuerpoIdentidad(inicial, inicial)).not.toHaveProperty("out_of_hours_default_message");
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

describe("ayudaFueraDeHorario", () => {
  const porDefecto = "¡Hola! Ahora estamos fuera de nuestro horario de atención. Te respondemos apenas volvamos.";

  it("sin mensaje dice que va el mensaje por defecto y cuál es", () => {
    const ayuda = ayudaFueraDeHorario("  ", porDefecto, true);
    expect(ayuda).toContain("mensaje por defecto");
    expect(ayuda).toContain(`«${porDefecto}»`);
  });

  it("con mensaje dice que el cliente recibe ese mensaje", () => {
    expect(ayudaFueraDeHorario("Cerrado", porDefecto, true)).toContain("recibe este mensaje");
  });

  it("sin horario aclara que el mensaje no se usa", () => {
    expect(ayudaFueraDeHorario("", porDefecto, false)).toContain("responde siempre");
  });
});
