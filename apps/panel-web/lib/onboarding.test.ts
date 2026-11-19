import { describe, expect, it } from "vitest";

import { ajustes } from "@/lib/testing/fixtures";

import {
  ESTADO_INICIAL,
  HORARIO_INICIAL,
  NOMBRE_SUGERIDO_DE_LA_BIENVENIDA,
  PASO_DE_4_A_5,
  TIPOS_DE_NEGOCIO,
  conLoRecomendado,
  conTipo,
  fraseDelTipo,
  ideasDeLaBienvenida,
  pasoDeCinco,
  pasoDelEditorEnLaBienvenida,
  textoDeAvance,
  textosDeSeguirDespues,
  accionDelAviso,
  agregarFrase,
  PASOS,
  PASOS_DEL_NEGOCIO,
  TOTAL_PASOS,
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

const RECORRIDO: Recorrido = { estado: "omitido", paso: 2, total_pasos: 5, aplica: true, abrir: false, avisar: true };
const listo: EstadoDelAsistente = {
  ...ESTADO_INICIAL,
  tipo: "ventas",
  negocio: "Sport Plus",
  descripcion: "Vendemos ropa deportiva en Manizales",
  nombreDelAgente: "Sofía",
};

describe("pasos del asistente", () => {
  it("exige tipo, nombre del negocio y una frase en «Tu negocio», y el nombre del agente en «Identidad» (SPEC-47)", () => {
    expect(errorDelPaso("negocio", { ...listo, tipo: null })).toMatch(/Elige a qué se dedica/);
    expect(errorDelPaso("negocio", { ...listo, negocio: " " })).toMatch(/cómo se llama tu negocio/);
    expect(errorDelPaso("negocio", { ...listo, descripcion: "corta" })).toMatch(/en una frase/);
    expect(errorDelPaso("negocio", { ...listo, nombreDelAgente: "  " })).toBeUndefined();
    expect(errorDelPaso("identidad", { ...listo, nombreDelAgente: "  " })).toMatch(/nombre/);
    expect(errorDelPaso("negocio", listo)).toBeUndefined();
    expect(errorDelPaso("identidad", listo)).toBeUndefined();
  });

  it("cinco estaciones (HU-UX-25): Tu negocio, Habilidades, Datos del cliente, Datos para probar y Revisar y publicar", () => {
    expect(PASOS.map((p) => p.id)).toEqual(["negocio", "habilidades", "datos-cliente", "conocimiento", "probar"]);
    expect(PASOS.map((p) => p.corto)).toEqual(["Tu negocio", "Habilidades", "Datos del cliente", "Datos para probar", "Revisar y publicar"]);
    expect(TOTAL_PASOS).toBe(5);
    expect(textoDeAvance(3)).toBe("Paso 3 de 5");
    expect(PASOS_DEL_NEGOCIO).toBe(1);
    expect(cambiosDelPaso("negocio", listo)).not.toHaveProperty("assistant_name");
    expect(cambiosDelPaso("identidad", listo)).toEqual({ assistant_name: listo.nombreDelAgente.trim() });
  });

  it("no deja salir del horario sin ningún día, pero deja salir sin horario", () => {
    expect(errorDelPaso("reglas", { ...listo, horario: { dias: [], bloque: "jornada" } })).toMatch(/al menos un día/);
    expect(errorDelPaso("reglas", { ...listo, horario: null })).toBeUndefined();
  });

  it("las respuestas de creación no preguntan qué vende: Ventas solo toma pedidos de productos (SPEC-43)", () => {
    expect(respuestasDeCreacion({ ...listo, largo: "cortas" })).toEqual({ largo_respuesta: "cortas" });
    expect(respuestasDeCreacion({ ...listo, tipo: "agenda" })).toEqual({ largo_respuesta: "normal" });
  });
});

describe("lo recomendado en «Tu negocio» (HU-UX-25)", () => {
  it("llega con «Vendo productos», «Laura» y la frase del tipo, y se puede seguir sin tocar nada", () => {
    expect(ESTADO_INICIAL.tipo).toBe("ventas");
    expect(ESTADO_INICIAL.nombreDelAgente).toBe("Laura");
    expect(NOMBRE_SUGERIDO_DE_LA_BIENVENIDA).toBe("Laura");
    expect(ESTADO_INICIAL.descripcion).toBe(fraseDelTipo("ventas"));
    expect(errorDelPaso("negocio", { ...ESTADO_INICIAL, negocio: "La Espiga" })).toBeUndefined();
    expect(errorDelPaso("identidad", ESTADO_INICIAL)).toBeUndefined();
  });

  it("cada tipo trae ícono, ayuda corta y una frase genérica (sin datos inventados del negocio)", () => {
    for (const t of TIPOS_DE_NEGOCIO) {
      expect(t.icono).toBeTruthy();
      expect(t.ayuda.length).toBeLessThanOrEqual(30);
      expect(t.frase.length).toBeGreaterThanOrEqual(10);
      // Sin cifras, precios ni lugares.
      expect(t.frase).not.toMatch(/\d|\$|Bogotá|norte|sur/);
    }
  });

  it("la frase sigue al tipo mientras el dueño no la edite; lo escrito por él se respeta", () => {
    const base = { ...ESTADO_INICIAL, negocio: "La Espiga" };
    const agenda = conTipo(base, "agenda");
    expect(agenda.descripcion).toBe(fraseDelTipo("agenda"));
    const editada = conTipo({ ...base, descripcion: "Pan artesanal por encargo" }, "agenda");
    expect(editada.descripcion).toBe("Pan artesanal por encargo");
    expect(conTipo({ ...base, descripcion: "  " }, "cobranza").descripcion).toBe(fraseDelTipo("cobranza"));
    const vuelta = conLoRecomendado({ ...editada, nombreDelAgente: "Tomás" });
    expect(vuelta).toMatchObject({ tipo: "ventas", nombreDelAgente: "Laura", descripcion: fraseDelTipo("ventas"), negocio: "La Espiga" });
  });

  it("«Laura» va primero en las ideas, luego las del tipo, sin nombres de función", () => {
    expect(ideasDeLaBienvenida("ventas")).toEqual(["Laura", "Sofía", "Vera", "Mateo"]);
    expect(ideasDeLaBienvenida("cobranza")).toEqual(["Laura", "Clara", "Nico"]);
    expect(ideasDeLaBienvenida(null)).toEqual(["Laura"]);
  });

  it("«Seguir después» dice que no atiende hasta terminar y que lo hecho queda guardado", () => {
    expect(textosDeSeguirDespues("Laura")).toEqual({
      titulo: "Laura no atiende hasta que termines.",
      detalle: "Lo que llevas queda guardado y retomas aquí desde Inicio.",
    });
    expect(textosDeSeguirDespues(" ").titulo).toBe("Tu agente no atiende hasta que termines.");
  });
});

describe("retomar con 5 estaciones (HU-UX-25)", () => {
  it("un recorrido guardado con 4 pasos se traduce: su paso 3 («Datos para probar») es el 4 de 5", () => {
    expect(PASO_DE_4_A_5).toEqual({ 1: 1, 2: 2, 3: 4, 4: 5 });
    expect(pasoDeCinco({ paso: 3, total_pasos: 4 })).toBe(4);
    expect(pasoDelEditorEnLaBienvenida({ paso: 3, total_pasos: 4 })).toBe("conocimiento");
    expect(pasoDelEditorEnLaBienvenida({ paso: 4, total_pasos: 4 })).toBe("probar");
  });

  it("con 5 la estación es la del servidor; antes de la 2 se empieza por «Habilidades»", () => {
    expect(pasoDelEditorEnLaBienvenida({ paso: 1, total_pasos: 5 })).toBe("habilidades");
    expect(pasoDelEditorEnLaBienvenida({ paso: 3, total_pasos: 5 })).toBe("datos-cliente");
    expect(pasoDelEditorEnLaBienvenida({ paso: 4, total_pasos: 5 })).toBe("conocimiento");
    expect(pasoDelEditorEnLaBienvenida({ paso: 9, total_pasos: 5 })).toBe("probar");
  });

  it("uno de 9 pasos pasa por la tabla de 9 a 4", () => {
    expect(pasoDeCinco({ paso: 5, total_pasos: 9 })).toBe(2);
    expect(pasoDeCinco({ paso: 7, total_pasos: 9 })).toBe(4);
    expect(pasoDeCinco({ paso: 9, total_pasos: 9 })).toBe(5);
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

  it("distingue cada nivel de calidez, incluidos Cálido y Muy cálido", () => {
    const seco = muestraDeVoz({ ...base, calidez: 0 }, "Sofía", "");
    const calido = muestraDeVoz({ ...base, calidez: 4 }, "Sofía", "");
    const muyCalido = muestraDeVoz({ ...base, calidez: 5 }, "Sofía", "");

    expect(seco).toContain("Vamos al punto");
    expect(calido).toContain("Con gusto te ayudo");
    expect(muyCalido).toContain("Me encanta poder ayudarte");
    expect(calido).not.toBe(muyCalido);
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
  it("cuenta las estaciones que faltan de 5 y cambia el verbo del botón", () => {
    expect(pasosQueFaltan(RECORRIDO)).toBe(4);
    expect(textoDelAviso(RECORRIDO)).toBe("Tu agente aún no está listo para responder. Faltan 4 de 5 pasos.");
    expect(textoDelAviso({ ...RECORRIDO, paso: 5 })).toBe("Tu agente aún no está listo para responder. Falta 1 de 5 pasos.");
    // Uno guardado con 4 pasos cuenta sobre 5: su paso 3 es el 4.
    expect(pasosQueFaltan({ ...RECORRIDO, paso: 3, total_pasos: 4 })).toBe(2);
    expect(accionDelAviso(RECORRIDO)).toBe("Continuar");
    expect(accionDelAviso({ ...RECORRIDO, paso: 1, estado: "omitido" })).toBe("Empezar");
    expect(pasosQueFaltan({ ...RECORRIDO, estado: "completo" })).toBe(0);
  });
});
