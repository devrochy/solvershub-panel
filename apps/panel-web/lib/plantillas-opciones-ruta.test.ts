import { describe, expect, it } from "vitest";

import { rutaDeBackend } from "@/lib/plantillas-opciones-ruta";

describe("rutaDeBackend (BFF de plantillas con opciones)", () => {
  it("reenvía la lista cerrada de rutas con su método", () => {
    expect(rutaDeBackend("GET", [])).toBe("/plantillas-opciones");
    expect(rutaDeBackend("POST", [])).toBe("/plantillas-opciones");
    expect(rutaDeBackend("GET", ["catalogo-acciones"])).toBe("/plantillas-opciones/catalogo-acciones");
    expect(rutaDeBackend("GET", ["catalogo-variables"])).toBe("/plantillas-opciones/catalogo-variables");
    expect(rutaDeBackend("POST", ["validar"])).toBe("/plantillas-opciones/validar");
    expect(rutaDeBackend("POST", ["vista-previa"])).toBe("/plantillas-opciones/vista-previa");
    expect(rutaDeBackend("GET", ["confirmar_cita"])).toBe("/plantillas-opciones/confirmar_cita");
    expect(rutaDeBackend("DELETE", ["confirmar_cita"])).toBe("/plantillas-opciones/confirmar_cita");
    expect(rutaDeBackend("PUT", ["confirmar_cita", "borrador"])).toBe("/plantillas-opciones/confirmar_cita/borrador");
    for (const accion of ["publicar", "retirar", "enviar-prueba"]) {
      expect(rutaDeBackend("POST", ["confirmar_cita", accion])).toBe(`/plantillas-opciones/confirmar_cita/${accion}`);
    }
  });

  it("rechaza lo que no está en la lista: otro método, otra ruta o una clave mal formada", () => {
    expect(rutaDeBackend("PUT", [])).toBeNull();
    expect(rutaDeBackend("DELETE", [])).toBeNull();
    expect(rutaDeBackend("POST", ["catalogo-acciones"])).toBeNull();
    expect(rutaDeBackend("GET", ["validar-ya"])).toBeNull();
    expect(rutaDeBackend("GET", ["Mayuscula"])).toBeNull();
    expect(rutaDeBackend("GET", ["a".repeat(41)])).toBeNull();
    expect(rutaDeBackend("GET", ["..", "admin"])).toBeNull();
    expect(rutaDeBackend("GET", ["clave", "publicar"])).toBeNull();
    expect(rutaDeBackend("POST", ["clave", "borrar"])).toBeNull();
    expect(rutaDeBackend("PUT", ["clave", "publicar"])).toBeNull();
    expect(rutaDeBackend("POST", ["clave", "publicar", "extra"])).toBeNull();
    expect(rutaDeBackend("POST", ["../x", "publicar"])).toBeNull();
  });
});
