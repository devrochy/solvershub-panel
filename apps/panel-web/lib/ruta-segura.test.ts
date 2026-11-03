import { describe, expect, it } from "vitest";

import { destinoTrasLogin, rutaDeLogin, rutaInternaSegura } from "@/lib/ruta-segura";

describe("rutaInternaSegura", () => {
  it("acepta rutas del panel, con consulta y fragmento", () => {
    expect(rutaInternaSegura("/ayuda")).toBe("/ayuda");
    expect(rutaInternaSegura("/ayuda/guia/pagina?x=1#seccion")).toBe("/ayuda/guia/pagina?x=1#seccion");
    expect(rutaInternaSegura(["/ayuda", "/otra"])).toBe("/ayuda");
  });

  it("rechaza lo que sale del panel o rompe el login", () => {
    for (const malo of [undefined, null, "", "ayuda", "//otro.test", "/\\otro.test", "https://otro.test", "javascript:alert(1)", "/a\nb", "/login", "/login?volver=/x", "/api/session/cerrar"]) {
      expect(rutaInternaSegura(malo as string | null | undefined)).toBeNull();
    }
  });

  it("destinoTrasLogin cae en el Resumen", () => {
    expect(destinoTrasLogin("//otro.test")).toBe("/dashboard");
    expect(destinoTrasLogin("/ayuda/x")).toBe("/ayuda/x");
  });

  it("rutaDeLogin codifica la ruta", () => {
    expect(rutaDeLogin("/ayuda/a b?x=1")).toBe("/login?volver=%2Fayuda%2Fa%20b%3Fx%3D1");
    expect(rutaDeLogin("//otro.test")).toBe("/login");
  });
});
