import { describe, expect, it } from "vitest";

import { rutaDeBackend } from "@/lib/plantillas-opciones-ruta";

describe("rutaDeBackend: publicar una versión en Meta", () => {
  it("reenvía solo POST …/versiones/<n>/publicar-en-meta", () => {
    expect(rutaDeBackend("POST", ["confirmar_cita", "versiones", "2", "publicar-en-meta"])).toBe(
      "/plantillas-opciones/confirmar_cita/versiones/2/publicar-en-meta",
    );
  });

  it("rechaza otro método, otra acción, una versión que no es número o una clave inválida", () => {
    expect(rutaDeBackend("GET", ["confirmar_cita", "versiones", "2", "publicar-en-meta"])).toBeNull();
    expect(rutaDeBackend("DELETE", ["confirmar_cita", "versiones", "2", "publicar-en-meta"])).toBeNull();
    expect(rutaDeBackend("POST", ["confirmar_cita", "versiones", "2", "retirar"])).toBeNull();
    expect(rutaDeBackend("POST", ["confirmar_cita", "versiones", "dos", "publicar-en-meta"])).toBeNull();
    expect(rutaDeBackend("POST", ["confirmar_cita", "versiones", "0", "publicar-en-meta"])).toBeNull();
    expect(rutaDeBackend("POST", ["confirmar_cita", "versiones", "../x", "publicar-en-meta"])).toBeNull();
    expect(rutaDeBackend("POST", ["Confirmar-Cita", "versiones", "2", "publicar-en-meta"])).toBeNull();
    expect(rutaDeBackend("POST", ["confirmar_cita", "otras", "2", "publicar-en-meta"])).toBeNull();
    expect(rutaDeBackend("POST", ["confirmar_cita", "versiones", "2"])).toBeNull();
  });
});
