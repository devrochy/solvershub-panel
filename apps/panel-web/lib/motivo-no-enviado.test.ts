import { describe, expect, it } from "vitest";

import { textoDeNoEnviado } from "./motivo-no-enviado";

describe("textoDeNoEnviado", () => {
  it("explica la pausa del negocio y del cliente (HU-ARCH-37)", () => {
    expect(textoDeNoEnviado("negocio_pausado")).toMatch(/asistente estaba en pausa\./);
    expect(textoDeNoEnviado("cliente_pausado")).toMatch(/en pausa para este cliente/);
  });

  it("mantiene el texto de sin plantilla y cae en «No enviado.» con lo demás", () => {
    expect(textoDeNoEnviado("sin_plantilla")).toMatch(/no tiene plantilla/);
    expect(textoDeNoEnviado("connection_paused")).toBe("No enviado.");
    expect(textoDeNoEnviado(null)).toBe("No enviado.");
  });
});
