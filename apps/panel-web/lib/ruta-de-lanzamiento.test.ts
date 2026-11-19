import { describe, expect, it } from "vitest";

import {
  ESTACIONES_DE_LA_BIENVENIDA,
  ESTACIONES_DE_NUEVO_AGENTE,
  TEXTO_SIN_NOMBRE,
  cambiosFrenteARecomendado,
  errorDelNombre,
  ideasDeNombre,
  inicialDe,
  nombreSugeridoDelTipo,
  numeroDeEstacion,
  textoDeCambios,
  tituloDeEstacion,
} from "@/lib/ruta-de-lanzamiento";

describe("estaciones de la ruta de lanzamiento", () => {
  it("las dos rutas tienen 5 estaciones y comparten las cuatro últimas", () => {
    expect(ESTACIONES_DE_LA_BIENVENIDA.map((e) => e.titulo)).toEqual([
      "Tu negocio",
      "Habilidades",
      "Datos del cliente",
      "Datos para probar",
      "Revisar y publicar",
    ]);
    expect(ESTACIONES_DE_NUEVO_AGENTE.map((e) => e.titulo)).toEqual([
      "Tipo",
      "Habilidades",
      "Datos del cliente",
      "Datos para probar",
      "Revisar y publicar",
    ]);
    expect(ESTACIONES_DE_LA_BIENVENIDA.slice(1)).toEqual(ESTACIONES_DE_NUEVO_AGENTE.slice(1));
  });

  it("numera igual en las dos rutas", () => {
    expect(numeroDeEstacion("negocio")).toBe(1);
    expect(numeroDeEstacion("tipo")).toBe(1);
    expect(numeroDeEstacion("datos-cliente")).toBe(3);
    expect(numeroDeEstacion("revisar")).toBe(5);
    expect(tituloDeEstacion("datos-probar")).toBe("Datos para probar");
  });
});

describe("cambiosFrenteARecomendado", () => {
  const recomendado = { tipo: "agenda", duracion: "45", superpoderes: ["a", "b"], historial: true };

  it("sin cambios devuelve una lista vacía", () => {
    expect(cambiosFrenteARecomendado({ ...recomendado }, recomendado)).toEqual([]);
  });

  it("cuenta cada opción cambiada, en el orden de lo recomendado", () => {
    expect(cambiosFrenteARecomendado({ ...recomendado, duracion: "60", tipo: "cobranza" }, recomendado)).toEqual([
      "tipo",
      "duracion",
    ]);
  });

  it("las listas se comparan como conjuntos", () => {
    expect(cambiosFrenteARecomendado({ ...recomendado, superpoderes: ["b", "a"] }, recomendado)).toEqual([]);
    expect(cambiosFrenteARecomendado({ ...recomendado, superpoderes: ["a"] }, recomendado)).toEqual(["superpoderes"]);
    expect(cambiosFrenteARecomendado({ ...recomendado, superpoderes: "a" }, recomendado)).toEqual(["superpoderes"]);
  });

  it("los interruptores y lo que falta", () => {
    expect(cambiosFrenteARecomendado({ ...recomendado, historial: false }, recomendado)).toEqual(["historial"]);
    expect(cambiosFrenteARecomendado({ tipo: "agenda" }, recomendado)).toEqual([]);
  });

  it("dice los cambios en palabras", () => {
    expect(textoDeCambios(1)).toBe("1 cambio");
    expect(textoDeCambios(2)).toBe("2 cambios");
  });
});

describe("nombre sugerido", () => {
  it("el sugerido va primero y sin repetir ni nombres de función", () => {
    expect(ideasDeNombre("Laura", "ventas")).toEqual(["Laura", "Sofía", "Mateo", "Vera"]);
    expect(ideasDeNombre("Tomás", "agenda", 3)).toEqual(["Tomás", "Sofía", "Mateo"]);
    expect(ideasDeNombre("Laura", "agenda")).not.toContain("Agenda");
    expect(ideasDeNombre("Laura", null)).toEqual(["Laura"]);
  });

  it("en Nuevo agente sugiere el primero del tipo", () => {
    expect(nombreSugeridoDelTipo("agenda")).toBe("Tomás");
  });

  it("sin nombre no se avanza", () => {
    expect(errorDelNombre("Laura")).toBeNull();
    expect(errorDelNombre("   ")).toBe(TEXTO_SIN_NOMBRE);
    expect(errorDelNombre("x".repeat(200))).toMatch(/máximo/);
    expect(inicialDe(" sofía")).toBe("S");
  });
});
