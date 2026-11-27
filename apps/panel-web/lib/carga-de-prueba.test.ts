import { describe, expect, it } from "vitest";

import {
  cabecerasSinAsignar,
  cargadosDelTipo,
  filasConAsignacion,
  leerCsv,
  metodoRecomendado,
  metodosDisponibles,
  obligatoriasSinColumna,
  origenesCargados,
  preguntasDelMetodo,
  textoDelArchivo,
  textoDelCostoPorFoto,
} from "./carga-de-prueba";

/** HU-UX-30: lógica de la estación 4 · Datos para probar. */

describe("formas de carga por entorno", () => {
  it("en test con plantilla de productos ofrece IA, CSV, fotos y siempre «Lo hago después»", () => {
    expect(metodosDisponibles({ disponible: true }, { importa_fotos: true })).toEqual(["ia", "csv", "fotos", "despues"]);
  });
  it("fuera de test (sin generar) y sin plantilla solo queda «Lo hago después»", () => {
    expect(metodosDisponibles(null, null)).toEqual(["despues"]);
    expect(metodosDisponibles({ disponible: false }, null)).toEqual(["despues"]);
  });
  it("una plantilla sin fotos no ofrece fotos", () => {
    expect(metodosDisponibles(null, { importa_fotos: false })).toEqual(["csv", "despues"]);
  });
  it("recomienda la primera que carga algo", () => {
    expect(metodoRecomendado(["ia", "csv", "despues"])).toBe("ia");
    expect(metodoRecomendado(["csv", "fotos", "despues"])).toBe("csv");
    expect(metodoRecomendado(["despues"])).toBe("despues");
  });
  it("cada forma tiene sus preguntas; «Lo hago después» solo la primera", () => {
    expect(preguntasDelMetodo("despues")).toEqual(["metodo"]);
    expect(preguntasDelMetodo("ia")).toEqual(["metodo", "generar", "prueba"]);
    expect(preguntasDelMetodo("csv")).toEqual(["metodo", "archivo", "revision", "prueba"]);
    expect(preguntasDelMetodo("fotos")).toEqual(["metodo", "archivo", "revision", "prueba"]);
  });
});

describe("leerCsv", () => {
  it("lee coma, comillas con comillas y saltos de línea adentro, CRLF y BOM", () => {
    const texto = '﻿nombre,precio,nota\r\n"Pan, grande",2500,"dice ""hola""\nadiós"\r\n\r\nTorta,45000,\n';
    expect(leerCsv(texto)).toEqual([
      ["nombre", "precio", "nota"],
      ["Pan, grande", "2500", 'dice "hola"\nadiós'],
      ["Torta", "45000", ""],
    ]);
  });
  it("detecta el punto y coma de Excel en español", () => {
    expect(leerCsv("nombre;precio\nPan;2.500,50")).toEqual([
      ["nombre", "precio"],
      ["Pan", "2.500,50"],
    ]);
  });
  it("lee como Windows-1252 un archivo que no es UTF-8", async () => {
    const bytes = new Uint8Array([0x41, 0x6c, 0x6d, 0x6f, 0x6a, 0xe1, 0x62, 0x61, 0x6e, 0x61]); // «Almojábana» en Latin-1
    expect(await textoDelArchivo(new Blob([bytes]))).toBe("Almojábana");
    expect(await textoDelArchivo(new Blob(["Almojábana"]))).toBe("Almojábana");
  });
});

describe("columnas a mano", () => {
  const mapeo = [
    { cabecera: "Ref", columna: "sku", origen: "heuristica" as const },
    { cabecera: "Valor", columna: "precio", origen: "ia" as const },
    { cabecera: "Medida", columna: null, origen: "ninguno" as const },
  ];
  const tabla = [
    ["Ref", "Valor", "Medida"],
    ["A1", "100", "M"],
    ["A2", "", "S"],
  ];

  it("lista lo que no se reconoció", () => {
    expect(cabecerasSinAsignar(mapeo)).toEqual(["Medida"]);
  });
  it("arma las filas con la asignación; la fila 1 es la cabecera y la IA sigue marcada si no se cambió", () => {
    const filas = filasConAsignacion(tabla, { Ref: "sku", Valor: "precio", Medida: "talla" }, mapeo);
    expect(filas).toEqual([
      { fila: 2, valores: { sku: "A1", precio: "100", talla: "M" }, inferidas: ["precio"] },
      { fila: 3, valores: { sku: "A2", precio: "", talla: "S" }, inferidas: [] },
    ]);
  });
  it("si el dueño cambia la columna que propuso la IA, deja de estar marcada", () => {
    const [fila] = filasConAsignacion(tabla, { Ref: "sku", Valor: "nombre", Medida: null }, mapeo);
    expect(fila).toEqual({ fila: 2, valores: { sku: "A1", nombre: "100" }, inferidas: [] });
  });
  it("dice qué obligatorias quedan sin columna", () => {
    const plantilla = {
      columnas: [
        { nombre: "sku", descripcion: "", obligatoria: true },
        { nombre: "nombre", descripcion: "", obligatoria: true },
        { nombre: "talla", descripcion: "", obligatoria: false },
      ],
    };
    expect(obligatoriasSinColumna(plantilla, { Ref: "sku", Medida: "talla" })).toEqual(["nombre"]);
  });
});

describe("costo y lo cargado", () => {
  it("el costo por foto, con el saldo del mes o sin tope", () => {
    const base = { por_foto: 2, llave_propia: false, usado: 96, limite: 100, disponible: 4 };
    expect(textoDelCostoPorFoto(base)).toBe("Cada foto cuesta 2 créditos. Te quedan 4 este mes; te decimos el total antes de reconocerlas.");
    expect(textoDelCostoPorFoto({ ...base, por_foto: 1, limite: null, disponible: null })).toBe(
      "Cada foto cuesta 1 crédito. Te decimos el total antes de reconocerlas.",
    );
  });
  it("sabe qué se puede borrar según el origen", () => {
    expect(origenesCargados([{ origen: "llm" }])).toEqual({ generado: true, importado: false });
    expect(origenesCargados([{ origen: "importacion" }, { origen: "plantilla" }])).toEqual({ generado: true, importado: true });
    expect(origenesCargados([])).toEqual({ generado: false, importado: false });
  });
  it("la prueba nombra solo lo del tipo (sin categorías)", () => {
    const registros = [
      { tipo: "categoria", nombre: "Panadería", origen: "llm" as const },
      { tipo: "producto", nombre: "Pan", origen: "llm" as const },
      { tipo: "tipo", nombre: "Asesoría", origen: "llm" as const },
    ];
    expect(cargadosDelTipo("ventas", registros).map((r) => r.nombre)).toEqual(["Pan"]);
    expect(cargadosDelTipo("agenda", registros).map((r) => r.nombre)).toEqual(["Asesoría"]);
  });
});
