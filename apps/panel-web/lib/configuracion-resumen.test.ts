import { describe, expect, it } from "vitest";

import type { OpcionConfig } from "@/lib/api/types";
import { avisoEnPalabras, llegadaDe } from "@/lib/fallidos";

import { habilidadesEnPalabras, horarioEnPalabras, memoriaEnPalabras, resumenDeGrupos, temperaturaEnPalabras, valorEnPalabras } from "./configuracion-resumen";

const opcion = (clave: string, grupo: OpcionConfig["grupo"], tipo: OpcionConfig["tipo"], etiqueta: string, extra: Partial<OpcionConfig> = {}): OpcionConfig => ({
  clave,
  grupo,
  tipo,
  etiqueta,
  explicacion: "",
  ejemplo: "",
  unidad: "",
  editable_por: "dueno",
  solo_lectura: false,
  almacen: "app_settings",
  ambito: "negocio",
  ...extra,
});

describe("resumen de Configuración (rediseño B)", () => {
  it("el horario se lee por días, juntando los que se repiten", () => {
    const lunAVie = [0, 1, 2, 3, 4].map((day) => ({ day, from: "09:00", to: "18:00" }));
    expect(horarioEnPalabras([...lunAVie, { day: 5, from: "09:00", to: "13:00" }])).toBe(
      "Lun a vie, 9:00 a. m. a 6:00 p. m. · sáb, 9:00 a. m. a 1:00 p. m.",
    );
    expect(horarioEnPalabras([{ day: 0, from: "08:00", to: "12:00" }, { day: 0, from: "14:00", to: "18:00" }])).toBe(
      "Lun, 8:00 a. m. a 12:00 p. m. y 2:00 p. m. a 6:00 p. m.",
    );
    expect(horarioEnPalabras([])).toBe("Sin horario: atiende a toda hora");
  });

  it("cada tipo de opción se dice en palabras", () => {
    const tono = opcion("persona_tone", "voz", "elegir_una", "Tono", { valores: [{ valor: "cercano", etiqueta: "Cercano", nota: "" }] });
    expect(valorEnPalabras(tono, "cercano")).toBe("Cercano");
    expect(valorEnPalabras(opcion("x", "voz", "booleano", "X"), true)).toBe("Sí");
    expect(valorEnPalabras(opcion("x", "voz", "entero", "X", { unidad: "puntos" }), 3)).toBe("3 puntos");
    expect(valorEnPalabras(opcion("x", "voz", "lista_de_textos", "X"), [])).toBe("Ninguna");
    expect(valorEnPalabras(opcion("x", "voz", "texto", "X"), "")).toBe("Sin escribir");
  });

  it("el resumen de una sección junta sus primeras opciones con algo que decir", () => {
    const catalogo = {
      version: "t",
      asistente: [],
      opciones: [
        opcion("persona_tone", "voz", "elegir_una", "Tono", { valores: [{ valor: "cercano", etiqueta: "Cercano", nota: "" }] }),
        opcion("persona_warmth", "voz", "entero", "Calidez", { unidad: "puntos" }),
        opcion("persona_forbidden", "voz", "lista_de_textos", "Frases prohibidas"),
      ],
    } as never;
    expect(resumenDeGrupos(catalogo, ["voz"], { persona_tone: "cercano", persona_warmth: 4, persona_forbidden: [] })).toBe("Cercano · calidez: 4 puntos");
    expect(resumenDeGrupos(null, ["voz"], {})).toBe("");
  });

  it("memoria, temperatura y habilidades en palabras", () => {
    expect(memoriaEnPalabras({ short_term_turns: 10, rag_top_k: 4 })).toBe("Recuerda 10 mensajes (normal) · busca: normal");
    expect(temperaturaEnPalabras(0.2)).toBe("Precisas");
    expect(temperaturaEnPalabras(1.4)).toBe("Creativas");
    expect(
      habilidadesEnPalabras([
        { name: "pack_commerce", display_name: "Comercio", enabled_for_tenant: true, status: "loaded" },
        { name: "pack_cobranza", display_name: "Cobranza", enabled_for_tenant: true, status: "loaded", tenant_health_error: "x" },
        { name: "pack_calendar", display_name: "Agenda", enabled_for_tenant: false, status: "loaded" },
      ]),
    ).toBe("2 activas · Cobranza con un problema");
    expect(habilidadesEnPalabras([])).toBe("Ninguna instalada");
  });
});

describe("mensajes fallidos en palabras (CFG-08)", () => {
  it("los avisos del sistema se nombran y la llegada sale del id", () => {
    expect(avisoEnPalabras("payment.approved")).toBe("Pago aprobado");
    expect(avisoEnPalabras("order")).toBe("Pedido");
    expect(avisoEnPalabras("otro.cosa")).toBe("otro.cosa");
    expect(llegadaDe("1731200000000-0")?.toISOString()).toBe("2024-11-10T00:53:20.000Z");
    expect(llegadaDe("abc")).toBeNull();
  });
});
