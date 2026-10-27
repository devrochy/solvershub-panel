import { describe, expect, it } from "vitest";

import { anclaDe, esEscenario, rutaDeAbrir, textoDelBoton } from "@/lib/qa/escenarios";

describe("escenarios de datos de prueba", () => {
  it("el botón dice Crear la primera vez y Crear otro después", () => {
    expect(textoDelBoton({ ultimo: null })).toBe("Crear");
    expect(textoDelBoton({ ultimo: { sufijo: "A1B2C3", detalle: ["x"], conteos: {}, ruta: "/dlq" } })).toBe("Crear otro");
  });

  it("Abrir solo lleva a rutas del propio panel", () => {
    expect(rutaDeAbrir("/conversaciones/8f2b9a3c-1d4e-4f5a-9b6c-7d8e9f0a1b2c")).toBe(
      "/conversaciones/8f2b9a3c-1d4e-4f5a-9b6c-7d8e9f0a1b2c",
    );
    expect(rutaDeAbrir("/agentes/calidad")).toBe("/agentes/calidad");
    expect(rutaDeAbrir("//evil.example/x")).toBeNull();
    expect(rutaDeAbrir("https://evil.example")).toBeNull();
    expect(rutaDeAbrir("javascript:alert(1)")).toBeNull();
    expect(rutaDeAbrir("/x\\..")).toBeNull();
    expect(rutaDeAbrir("")).toBeNull();
    expect(rutaDeAbrir(null)).toBeNull();
  });

  it("el ancla es la del catálogo y la guía reconoce los escenarios", () => {
    expect(anclaDe("canary-en-curso")).toBe("datos-escenario-canary-en-curso");
    expect(esEscenario("datos-escenario-notificaciones")).toBe(true);
    expect(esEscenario("datos-wompi-sandbox")).toBe(false);
  });
});
