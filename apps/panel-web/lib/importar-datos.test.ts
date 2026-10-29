import { describe, expect, it } from "vitest";

import { avisoDeColumnas, resumenDeImportacion, resumenDeVistaPrevia, urlDePlantilla } from "./importar-datos";

describe("importar datos existentes (HU-QA-12)", () => {
  it("resume la vista previa", () => {
    expect(resumenDeVistaPrevia({ total_filas: 12, nuevas: 9, existentes: 2, con_errores: 1 })).toBe(
      "12 filas: 9 nuevas, 2 ya existían y 1 con error.",
    );
    expect(resumenDeVistaPrevia({ total_filas: 1, nuevas: 1, existentes: 0, con_errores: 0 })).toBe(
      "1 fila: 1 nueva, 0 ya existían y 0 con errores.",
    );
  });

  it("avisa que teléfonos y correos no se importan", () => {
    expect(avisoDeColumnas([])).toBeNull();
    expect(avisoDeColumnas(["telefono", "correo"])).toBe(
      "No se importan teléfonos ni correos (telefono, correo): los clientes se crean sin ellos.",
    );
    expect(avisoDeColumnas(["notas"])).toBe("Columnas que no son de la plantilla y se ignoran: notas.");
    expect(avisoDeColumnas(["whatsapp", "notas"])).toContain("Columnas que no son de la plantilla");
  });

  it("resume lo importado, lo que ya existía y lo omitido", () => {
    expect(resumenDeImportacion({ conteos: { producto: 9, categoria: 2 }, existentes: 2, con_errores: 1 })).toBe(
      "Listo: 9 productos y 2 categorías importados; 2 ya existían; 1 omitidas por errores.",
    );
    expect(resumenDeImportacion({ conteos: { tipo: 1 }, existentes: 1, con_errores: 0 })).toBe(
      "Listo: 1 tipo de cita importados; 1 ya existía.",
    );
  });

  it("apunta la plantilla al BFF del agente", () => {
    expect(urlDePlantilla("abc")).toBe("/api/agentes/abc/importar-datos/plantilla");
  });
});
