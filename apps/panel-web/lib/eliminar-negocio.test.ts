import { describe, expect, it } from "vitest";

import { MENSAJE_NO_SUSPENDIDO, mensajeErrorNegocio, sePuedeEliminar } from "@/lib/eliminar-negocio";

describe("eliminar negocio solo si está suspendido (agent-core #408)", () => {
  it("solo habilita la eliminación con el negocio suspendido", () => {
    expect(sePuedeEliminar("suspended")).toBe(true);
    expect(sePuedeEliminar("active")).toBe(false);
    expect(sePuedeEliminar("")).toBe(false);
  });

  it("traduce el 409 tenant_not_suspended a un mensaje claro", () => {
    expect(
      mensajeErrorNegocio({
        code: "tenant_not_suspended",
        error: "suspéndelo primero (`agent-core tenant deactivate x`, o Desactivar en el panel)",
      }),
    ).toBe(MENSAJE_NO_SUSPENDIDO);
  });

  it("deja el mensaje del core para el resto de errores", () => {
    expect(mensajeErrorNegocio({ code: "bad_request", error: "Frase incorrecta." })).toBe("Frase incorrecta.");
    expect(mensajeErrorNegocio({ error: "Error 500" })).toBe("Error 500");
  });
});
