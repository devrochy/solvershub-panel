import { describe, expect, it } from "vitest";

import { cookieDeVista, vistaElegida, vistaEnEnlace } from "@/lib/vista-guardada";

describe("vista recordada (lista o vitrina)", () => {
  it("manda la URL; sin ella, la guardada; sin nada, la lista", () => {
    expect(vistaElegida("productos", "vitrina", "lista")).toBe("vitrina");
    expect(vistaElegida("productos", undefined, "vitrina")).toBe("vitrina");
    expect(vistaElegida("productos", "inventada", undefined)).toBe("lista");
    expect(vistaElegida("pedidos", undefined, "vitrina")).toBe("lista");
  });

  it("los enlaces solo escriben la vista cuando difiere de la guardada", () => {
    expect(vistaEnEnlace("productos", "lista", undefined)).toBe("");
    expect(vistaEnEnlace("productos", "vitrina", undefined)).toBe("vitrina");
    expect(vistaEnEnlace("productos", "vitrina", "vitrina")).toBe("");
    expect(vistaEnEnlace("productos", "lista", "vitrina")).toBe("lista");
    expect(cookieDeVista("pedidos", "etapas")).toMatch(/^panel_vista_pedidos=etapas; path=\//);
  });

  it("Conexiones abre en lista y recuerda la cuadrícula", () => {
    expect(vistaElegida("conexiones", undefined, undefined)).toBe("lista");
    expect(vistaElegida("conexiones", "cuadricula", undefined)).toBe("cuadricula");
    expect(vistaElegida("conexiones", "inventada", undefined)).toBe("lista");
    expect(vistaEnEnlace("conexiones", "lista", undefined)).toBe("");
    expect(vistaEnEnlace("conexiones", "cuadricula", undefined)).toBe("cuadricula");
    expect(vistaEnEnlace("conexiones", "lista", "cuadricula")).toBe("lista");
    expect(cookieDeVista("conexiones", "cuadricula")).toMatch(/^panel_vista_conexiones=cuadricula; path=\//);
  });
});
