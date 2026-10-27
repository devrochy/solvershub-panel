import { describe, expect, it } from "vitest";

import { ajustes } from "@/lib/testing/fixtures";

import {
  ESTADO_INICIAL,
  HORARIO_INICIAL,
  accionDelAviso,
  agregarFrase,
  cambiosDelPaso,
  errorDelPaso,
  estadoDesdeIdentidad,
  franjasDeHorario,
  horarioDeFranjas,
  motivosDePalabras,
  muestraDeVoz,
  palabrasDeEscalar,
  pasosQueFaltan,
  resumenDeHorario,
  respuestasDeCreacion,
  textoDelAviso,
  type EstadoDelAsistente,
  type Recorrido,
} from "./onboarding";

const RECORRIDO: Recorrido = { estado: "omitido", paso: 3, total_pasos: 6, aplica: true, abrir: false, avisar: true };
const listo: EstadoDelAsistente = {
  ...ESTADO_INICIAL,
  tipo: "ventas",
  descripcion: "Vendemos ropa deportiva en Manizales",
  nombreDelAgente: "Sofía",
};

describe("pasos del asistente", () => {
  it("exige tipo, una frase del negocio y un nombre antes de salir del primer paso", () => {
    expect(errorDelPaso("negocio", ESTADO_INICIAL)).toMatch(/Elige a qué se dedica/);
    expect(errorDelPaso("negocio", { ...listo, descripcion: "corta" })).toMatch(/en una frase/);
    expect(errorDelPaso("negocio", { ...listo, nombreDelAgente: "  " })).toMatch(/nombre/);
    expect(errorDelPaso("negocio", listo)).toBeUndefined();
  });

  it("no deja salir del horario sin ningún día, pero deja salir sin horario", () => {
    expect(errorDelPaso("reglas", { ...listo, horario: { dias: [], bloque: "jornada" } })).toMatch(/al menos un día/);
    expect(errorDelPaso("reglas", { ...listo, horario: null })).toBeUndefined();
  });

  it("las respuestas de creación solo llevan «qué vendes» en ventas", () => {
    expect(respuestasDeCreacion({ ...listo, queVende: "planes", largo: "cortas" })).toEqual({
      largo_respuesta: "cortas",
      que_vendes: "planes",
    });
    expect(respuestasDeCreacion({ ...listo, tipo: "agenda" })).toEqual({ largo_respuesta: "normal" });
  });
});

describe("horario del comercio", () => {
  it("convierte días y bloque en franjas con el día 0 = lunes", () => {
    expect(franjasDeHorario(HORARIO_INICIAL)).toEqual([0, 1, 2, 3, 4].map((day) => ({ day, from: "08:00", to: "18:00" })));
    expect(franjasDeHorario({ dias: [5, 5, 6], bloque: "todo" })).toEqual([
      { day: 5, from: "00:00", to: "23:59" },
      { day: 6, from: "00:00", to: "23:59" },
    ]);
    expect(franjasDeHorario({ dias: [1], bloque: null })).toEqual([]);
  });

  it("reconoce al retomar solo lo que el asistente genera", () => {
    expect(horarioDeFranjas(franjasDeHorario(HORARIO_INICIAL))).toEqual(HORARIO_INICIAL);
    expect(horarioDeFranjas([{ day: 0, from: "09:30", to: "17:00" }])).toBeNull();
    expect(horarioDeFranjas([{ day: 0, from: "08:00", to: "12:00" }, { day: 1, from: "13:00", to: "18:00" }])).toBeNull();
  });

  it("lo dice en palabras", () => {
    expect(resumenDeHorario(HORARIO_INICIAL)).toBe("Lunes a viernes, 8:00 a 18:00");
    expect(resumenDeHorario({ dias: [0, 1, 2, 3, 4, 5, 6], bloque: "todo" })).toBe("Todos los días, las 24 horas");
    expect(resumenDeHorario({ dias: [5], bloque: "manana" })).toBe("Sáb, 8:00 a 12:00");
    expect(resumenDeHorario({ dias: [], bloque: "manana" })).toBe("");
  });

  it("al guardar el paso de reglas el horario es informativo (el agente responde 24/7)", () => {
    const cambios = cambiosDelPaso("reglas", listo);
    expect(cambios.business_hours_mode).toBe("informativo");
    expect(cambios.business_ranges).toHaveLength(5);
  });
});

describe("escalar y frases prohibidas", () => {
  it("los motivos suman palabras sin repetir y se reconocen al retomar", () => {
    const palabras = palabrasDeEscalar(["persona", "reclamo"]);
    expect(new Set(palabras).size).toBe(palabras.length);
    expect(motivosDePalabras(palabras)).toEqual(["persona", "reclamo"]);
    expect(motivosDePalabras(["asesor"])).toEqual([]);
  });

  it("agrega frases limpias, sin repetir y con tope", () => {
    expect(agregarFrase(["gratis"], "  Gratis ")).toEqual(["gratis"]);
    expect(agregarFrase([], "  sin   falta ")).toEqual(["sin falta"]);
    expect(agregarFrase([], "   ")).toEqual([]);
    const llena = Array.from({ length: 12 }, (_, i) => `f${i}`);
    expect(agregarFrase(llena, "otra")).toBe(llena);
  });
});

describe("voz", () => {
  const base = { tono: "cercano", calidez: 4, emojis: "sparse", largo: "normal" } as const;

  it("cambia con cada decisión y no usa el modelo", () => {
    const normal = muestraDeVoz(base, "Sofía", "Sport Plus");
    expect(normal).toContain("Soy Sofía, de Sport Plus");
    expect(muestraDeVoz({ ...base, tono: "formal" }, "Sofía", "")).toContain("Le atiende Sofía");
    expect(muestraDeVoz({ ...base, emojis: "none" }, "Sofía", "")).not.toMatch(/[🙂😊]/u);
    expect(muestraDeVoz({ ...base, emojis: "free" }, "Sofía", "")).toContain("😊");
    expect(muestraDeVoz({ ...base, largo: "cortas" }, "Sofía", "").length).toBeLessThan(normal.length);
    expect(muestraDeVoz({ ...base, largo: "detalladas" }, "Sofía", "").length).toBeGreaterThan(normal.length);
  });

  it("guarda la voz con los valores que acepta la API", () => {
    expect(cambiosDelPaso("voz", { ...listo, tono: "formal", largo: "detalladas", calidez: 9 })).toEqual({
      persona_tone: "formal",
      persona_warmth: 5,
      persona_emojis: "sparse",
      persona_max_length: 900,
    });
  });
});

describe("retomar", () => {
  it("rellena el estado con lo ya guardado en Identidad", () => {
    const estado = estadoDesdeIdentidad({
      ...ajustes.identity,
      assistant_name: "Luna",
      business_description: "Peluquería",
      persona_tone: "formal",
      persona_emojis: "none",
      persona_max_length: 300,
      persona_warmth: 2,
      business_ranges: [{ day: 0, from: "08:00", to: "12:00" }],
      escalation_keywords: palabrasDeEscalar(["pago"]),
      persona_forbidden: ["gratis"],
    });
    expect(estado).toMatchObject({
      nombreDelAgente: "Luna",
      descripcion: "Peluquería",
      tono: "formal",
      emojis: "none",
      largo: "cortas",
      calidez: 2,
      horario: { dias: [0], bloque: "manana" },
      motivos: ["pago"],
      prohibidas: ["gratis"],
    });
  });

  it("sin nada guardado conserva las sugerencias", () => {
    const estado = estadoDesdeIdentidad({ ...ajustes.identity, business_ranges: [], escalation_keywords: [], persona_forbidden: [] });
    expect(estado.horario).toEqual(HORARIO_INICIAL);
    expect(estado.motivos).toEqual(ESTADO_INICIAL.motivos);
  });
});

describe("aviso", () => {
  it("cuenta los pasos que faltan y cambia el verbo del botón", () => {
    expect(pasosQueFaltan(RECORRIDO)).toBe(4);
    expect(textoDelAviso(RECORRIDO)).toBe("Tu agente aún no está listo para probar. Faltan 4 pasos.");
    expect(textoDelAviso({ ...RECORRIDO, paso: 6 })).toMatch(/Falta 1 paso\./);
    expect(accionDelAviso(RECORRIDO)).toBe("Continuar");
    expect(accionDelAviso({ ...RECORRIDO, paso: 1, estado: "omitido" })).toBe("Empezar");
    expect(pasosQueFaltan({ ...RECORRIDO, estado: "completo" })).toBe(0);
  });
});
