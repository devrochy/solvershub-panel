import { describe, expect, it } from "vitest";

import { indexarCatalogo } from "@/lib/catalogo-config";
import {
  alternarOpcion,
  cambiosDe,
  conCambiosAplicados,
  cuerpoDeAplicar,
  cuerpoDeVistaPrevia,
  describirCambio,
  elegidasDe,
  elegirUna,
  guardarAvance,
  guionDe,
  hayRespuestas,
  leerAvance,
  leerRespuestas,
  olvidarAvance,
  pasoDeLaPregunta,
  pasosDelGuion,
  quitarRespuesta,
  respuestasVigentes,
  textoDeValor,
  type AlmacenLocal,
} from "@/lib/configuracion-asistente";
import { franjasLegibles } from "@/lib/horario-atencion";
import {
  CATALOGO_CON_ASISTENTE,
  GUION_ATENCION,
  GUION_VOZ,
  OPCIONES_DEL_ASISTENTE,
  PROPUESTA_DE_ATENCION,
  PROPUESTA_DE_VOZ,
} from "@/lib/testing/asistente-config";

const [tono, prohibidas] = GUION_VOZ.preguntas;
const indice = indexarCatalogo(CATALOGO_CON_ASISTENTE);

function almacenFalso(): AlmacenLocal & { datos: Map<string, string> } {
  const datos = new Map<string, string>();
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
    removeItem: (k) => void datos.delete(k),
  };
}

describe("guion del asistente", () => {
  it("cada sección del menú toma su guion del catálogo", () => {
    expect(guionDe(CATALOGO_CON_ASISTENTE, "voz")?.seccion).toBe("voz");
    expect(guionDe(CATALOGO_CON_ASISTENTE, "horario")?.seccion).toBe("atencion");
  });

  it("sin guion no hay asistente: secciones sin asistente, catálogo viejo o ausente", () => {
    expect(guionDe(CATALOGO_CON_ASISTENTE, "identidad")).toBeNull();
    expect(guionDe(CATALOGO_CON_ASISTENTE, "calidad")).toBeNull();
    expect(guionDe({}, "voz")).toBeNull(); // un backend anterior no manda `asistente`
    expect(guionDe({ asistente: [] }, "voz")).toBeNull();
    expect(guionDe(null, "voz")).toBeNull();
    expect(guionDe({ asistente: [{ ...GUION_VOZ, preguntas: [] }] }, "voz")).toBeNull();
  });

  it("una pantalla por pregunta y una última para revisar", () => {
    const pasos = pasosDelGuion(GUION_ATENCION);
    expect(pasos.map((p) => p.id)).toEqual(["horario", "fuera_de_horario", "revisar"]);
    expect(pasos[2].titulo).toBe("Revisa los cambios");
    expect(pasoDeLaPregunta("fuera_de_horario", pasos)).toBe(1);
    expect(pasoDeLaPregunta("revisar", pasos)).toBeNull();
    expect(pasoDeLaPregunta("no_existe", pasos)).toBeNull();
  });
});

describe("respuestas", () => {
  it("elegir una opción reemplaza la anterior y quitarla deja la pregunta sin responder", () => {
    let r = elegirUna({}, tono, "cercano");
    r = elegirUna(r, tono, "profesional");
    expect(r).toEqual({ tono: "profesional" });
    expect(elegidasDe(r, tono)).toEqual(["profesional"]);
    expect(hayRespuestas(r)).toBe(true);
    r = quitarRespuesta(r, "tono");
    expect(r).toEqual({});
    expect(hayRespuestas(r)).toBe(false);
    expect(elegidasDe(r, tono)).toEqual([]);
  });

  it("en las de varias, marcar y desmarcar; sin nada marcado queda `[]` (ninguna), no «sin responder»", () => {
    let r = alternarOpcion({}, prohibidas, "gratis", true);
    r = alternarOpcion(r, prohibidas, "garantizado", true);
    expect(r).toEqual({ prohibidas: ["garantizado", "gratis"] }); // en el orden del guion
    r = alternarOpcion(r, prohibidas, "gratis", false);
    r = alternarOpcion(r, prohibidas, "garantizado", false);
    expect(r).toEqual({ prohibidas: [] });
    expect(hayRespuestas(r)).toBe(true);
  });

  it("descarta lo que ya no está en el guion (preguntas y opciones viejas, formas raras)", () => {
    const crudo = { tono: "cercano", prohibidas: ["gratis", "ya_no_existe"], vieja: "x" };
    expect(respuestasVigentes(crudo, GUION_VOZ)).toEqual({ tono: "cercano", prohibidas: ["gratis"] });
    expect(respuestasVigentes({ tono: "ya_no_existe" }, GUION_VOZ)).toEqual({});
    expect(respuestasVigentes({ tono: ["cercano"], prohibidas: "gratis" }, GUION_VOZ)).toEqual({});
    expect(respuestasVigentes(null, GUION_VOZ)).toEqual({});
    expect(respuestasVigentes([], GUION_VOZ)).toEqual({});
  });

  it("valida la forma de las respuestas que llegan a un BFF", () => {
    expect(leerRespuestas({ tono: "cercano", prohibidas: ["a"] })).toEqual({ tono: "cercano", prohibidas: ["a"] });
    expect(leerRespuestas({})).toEqual({});
    expect(leerRespuestas(null)).toBeNull();
    expect(leerRespuestas([])).toBeNull();
    expect(leerRespuestas({ tono: 3 })).toBeNull();
    expect(leerRespuestas({ prohibidas: ["a", 1] })).toBeNull();
  });

  it("los cuerpos solo llevan preguntas del guion; aplicar suma la huella de la vista previa", () => {
    const r = { tono: "cercano", fantasma: "x" };
    expect(cuerpoDeVistaPrevia(GUION_VOZ, r)).toEqual({ respuestas: { tono: "cercano" } });
    expect(cuerpoDeAplicar(GUION_VOZ, r, "h1")).toEqual({ respuestas: { tono: "cercano" }, huella: "h1" });
  });
});

describe("retoma en este navegador", () => {
  it("guarda y retoma las respuestas y el paso, y se olvida", () => {
    const almacen = almacenFalso();
    guardarAvance("voz", { tono: "cercano" }, 1, almacen);
    expect(leerAvance("voz", GUION_VOZ, almacen)).toEqual({ respuestas: { tono: "cercano" }, paso: 1 });
    expect(leerAvance("atencion", GUION_ATENCION, almacen)).toBeNull(); // una clave por sección
    olvidarAvance("voz", almacen);
    expect(leerAvance("voz", GUION_VOZ, almacen)).toBeNull();
  });

  it("nunca retoma en «Revisa los cambios» ni con respuestas que ya no valen", () => {
    const almacen = almacenFalso();
    guardarAvance("voz", { tono: "cercano" }, 2, almacen); // 2 = el paso de revisar
    expect(leerAvance("voz", GUION_VOZ, almacen)?.paso).toBe(1);
    guardarAvance("voz", { tono: "ya_no_existe" }, 0, almacen);
    expect(leerAvance("voz", GUION_VOZ, almacen)).toBeNull();
  });

  it("si el almacenamiento falla o trae basura, el asistente sigue sin retomar", () => {
    const roto: AlmacenLocal = {
      getItem: () => {
        throw new Error("bloqueado");
      },
      setItem: () => {
        throw new Error("bloqueado");
      },
      removeItem: () => {
        throw new Error("bloqueado");
      },
    };
    expect(leerAvance("voz", GUION_VOZ, roto)).toBeNull();
    expect(() => guardarAvance("voz", { tono: "cercano" }, 0, roto)).not.toThrow();
    expect(() => olvidarAvance("voz", roto)).not.toThrow();
    const basura = almacenFalso();
    basura.datos.set("configuracion-asistente:voz", "{no es json");
    expect(leerAvance("voz", GUION_VOZ, basura)).toBeNull();
    expect(leerAvance("voz", GUION_VOZ, null)).toBeNull();
  });
});

describe("valores legibles", () => {
  it("franjas: juntan los días con las mismas horas", () => {
    expect(franjasLegibles([])).toBe("Siempre, sin horario");
    expect(franjasLegibles([0, 1, 2, 3, 4].map((day) => ({ day, from: "08:00", to: "18:00" })))).toBe("Lun a Vie 08:00–18:00");
    expect(franjasLegibles([0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, from: "08:00", to: "18:00" })))).toBe("Todos los días 08:00–18:00");
    expect(
      franjasLegibles([
        { day: 0, from: "08:00", to: "12:00" },
        { day: 1, from: "08:00", to: "12:00" },
        { day: 3, from: "08:00", to: "12:00" },
        { day: 5, from: "09:00", to: "13:00" },
      ]),
    ).toBe("Lun y Mar, Jue 08:00–12:00; Sáb 09:00–13:00");
    expect(franjasLegibles("basura")).toBe("Siempre, sin horario");
  });

  it("cada tipo se escribe para una persona, con las etiquetas del catálogo", () => {
    const op = (clave: string) => indice.get(clave);
    expect(textoDeValor("persona_tone", op("persona_tone"), "cercano")).toBe("Cercano");
    expect(textoDeValor("persona_tone", op("persona_tone"), "raro")).toBe("raro"); // fila antigua: el crudo
    expect(textoDeValor("persona_warmth", op("persona_warmth"), 4)).toBe("4 puntos");
    expect(textoDeValor("persona_forbidden", op("persona_forbidden"), ["a", "b"])).toBe("a, b");
    expect(textoDeValor("persona_forbidden", op("persona_forbidden"), [])).toBe("Ninguna");
    expect(textoDeValor("business_ranges", op("business_ranges"), [])).toBe("Siempre, sin horario");
    expect(textoDeValor("x", undefined, true)).toBe("Sí");
    expect(textoDeValor("x", undefined, null)).toBe("Sin definir");
    expect(textoDeValor("x", undefined, "")).toBe("Vacío");
    expect(textoDeValor("out_of_hours_message", op("out_of_hours_message"), "")).toBe("El aviso por defecto");
    expect(textoDeValor("out_of_hours_message", op("out_of_hours_message"), "x".repeat(300))).toHaveLength(161);
  });

  it("describe un cambio con la etiqueta del servidor y la marca de «lo cambiaste a mano»", () => {
    const [tonoCambio, calidez] = cambiosDe(PROPUESTA_DE_VOZ);
    expect(describirCambio(tonoCambio, indice)).toEqual({
      clave: "persona_tone",
      etiqueta: "Tono",
      actual: "Formal",
      propuesto: "Cercano",
      editadoAMano: true,
    });
    expect(describirCambio(calidez, indice)).toMatchObject({ actual: "3 puntos", propuesto: "4 puntos", editadoAMano: false });
    const mensaje = describirCambio(cambiosDe(PROPUESTA_DE_ATENCION)[2], indice);
    expect(mensaje).toMatchObject({ actual: "Volvemos mañana.", propuesto: "El aviso por defecto", editadoAMano: true });
  });

  it("aplica los cambios a los valores del formulario sin inventar claves", () => {
    const valores = { persona_tone: "formal", persona_warmth: 3, assistant_name: "Sol" };
    expect(conCambiosAplicados(valores, [...cambiosDe(PROPUESTA_DE_VOZ), { clave: "ajena", etiqueta: "x", propuesto: 1, editado_a_mano: false }])).toEqual({
      persona_tone: "cercano",
      persona_warmth: 4,
      assistant_name: "Sol",
    });
    expect(valores.persona_tone).toBe("formal");
  });

  it("el catálogo de prueba cubre las claves del guion", () => {
    const claves = new Set(OPCIONES_DEL_ASISTENTE.map((o) => o.clave));
    for (const guion of [GUION_VOZ, GUION_ATENCION]) {
      for (const p of guion.preguntas) for (const o of p.opciones) for (const clave of Object.keys(o.cambios)) expect(claves.has(clave)).toBe(true);
    }
  });
});
