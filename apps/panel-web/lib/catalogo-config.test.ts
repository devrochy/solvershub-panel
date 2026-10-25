import { describe, expect, it } from "vitest";

import type { CatalogoConfig, OpcionConfig } from "@/lib/api/types";

import {
  ayudaDeOpcion,
  dependencia,
  errorDeRango,
  erroresDeRango,
  etiquetaDeValor,
  indexarCatalogo,
  opcionesDelGrupo,
  rangoTexto,
  valoresConActual,
} from "./catalogo-config";

const velocidad: OpcionConfig = {
  clave: "debounce_mode",
  grupo: "respuesta",
  tipo: "elegir_una",
  etiqueta: "Velocidad de respuesta",
  explicacion: "Cuánto espera el asistente antes de responder.",
  ejemplo: "",
  unidad: "",
  valores: [
    { valor: "inmediato", etiqueta: "Inmediata", nota: "responde sin esperar" },
    { valor: "natural", etiqueta: "Natural", nota: "espera 15 s" },
  ],
  por_defecto: "natural",
  editable_por: "dueno",
  solo_lectura: false,
  almacen: "behavior_config:debounce_mode",
};
const puntaje: OpcionConfig = {
  ...velocidad,
  clave: "difficulty_score_threshold",
  tipo: "entero",
  etiqueta: "Puntaje para razonamiento",
  explicacion: "Puntaje de dificultad desde el cual se razona.",
  ejemplo: "5",
  unidad: "puntos",
  valores: [],
  minimo: 1,
  maximo: 10,
  por_defecto: 2,
};
const mensaje: OpcionConfig = {
  ...velocidad,
  clave: "out_of_hours_message",
  tipo: "texto_largo",
  etiqueta: "Mensaje fuera de horario",
  valores: [],
  depende_de: { clave: "business_ranges", condicion: "no_vacia", valor: null, motivo: "Sin horario, este mensaje no se usa." },
};

describe("catálogo de configuración", () => {
  it("indexa por clave y tolera un catálogo ausente", () => {
    const catalogo: CatalogoConfig = { version: "x", opciones: [velocidad, puntaje] };
    expect(indexarCatalogo(catalogo).get("debounce_mode")?.etiqueta).toBe("Velocidad de respuesta");
    expect(indexarCatalogo(null).size).toBe(0);
  });

  it("muestra la etiqueta con su nota, nunca el identificador crudo", () => {
    expect(etiquetaDeValor(velocidad.valores![1])).toBe("Natural · espera 15 s");
    expect(etiquetaDeValor({ valor: "x", etiqueta: "X", nota: "" })).toBe("X");
  });

  it("conserva a la vista un valor guardado que ya no está en la lista", () => {
    expect(valoresConActual(velocidad, "natural")).toHaveLength(2);
    const con = valoresConActual(velocidad, "rarísimo");
    expect(con).toHaveLength(3);
    expect(con[2]).toMatchObject({ valor: "rarísimo", nota: "valor actual" });
  });

  it("arma la ayuda con qué cambia, ejemplo y rango", () => {
    expect(ayudaDeOpcion(puntaje)).toBe(
      "Puntaje de dificultad desde el cual se razona. Ejemplo: 5. Entre 1 y 10 puntos.",
    );
    expect(ayudaDeOpcion(velocidad)).toBe("Cuánto espera el asistente antes de responder.");
    expect(ayudaDeOpcion({ ...velocidad, ejemplo: "Cercana y breve." })).toBe(
      "Cuánto espera el asistente antes de responder. Ejemplo: Cercana y breve.",
    );
    expect(rangoTexto(velocidad)).toBe("");
  });

  it("rechaza en el cliente lo que está fuera del rango", () => {
    expect(errorDeRango(puntaje, 5)).toBeNull();
    expect(errorDeRango(puntaje, 11)).toBe("«Puntaje para razonamiento» debe estar entre 1 y 10.");
    expect(errorDeRango(puntaje, 0)).not.toBeNull();
    expect(errorDeRango(puntaje, Number.NaN)).not.toBeNull();
    expect(errorDeRango(velocidad, 3)).toBeNull();
  });

  it("deshabilita una opción cuyo requisito no se cumple y dice por qué", () => {
    expect(dependencia(velocidad, {}).activa).toBe(true);
    expect(dependencia(mensaje, { business_ranges: [] })).toEqual({
      activa: false,
      motivo: "Sin horario, este mensaje no se usa.",
      de: "business_ranges",
    });
    expect(dependencia(mensaje, { business_ranges: [{ day: 0 }] }).activa).toBe(true);
  });

  it("evalúa las condiciones verdadera e igual", () => {
    const igual = { ...mensaje, depende_de: { clave: "waweb_mode", condicion: "igual" as const, valor: "allow_outbound", motivo: "m" } };
    expect(dependencia(igual, { waweb_mode: "reply_only" }).activa).toBe(false);
    expect(dependencia(igual, { waweb_mode: "allow_outbound" }).activa).toBe(true);
    const verdadera = { ...mensaje, depende_de: { clave: "x", condicion: "verdadera" as const, valor: null, motivo: "m" } };
    expect(dependencia(verdadera, { x: true }).activa).toBe(true);
    expect(dependencia(verdadera, { x: "true" }).activa).toBe(false);
  });
});

describe("pantalla de Identidad", () => {
  const catalogo: CatalogoConfig = { version: "x", opciones: [velocidad, puntaje, mensaje] };

  it("solo lista las opciones del grupo que la pantalla puede mostrar", () => {
    const valores = { debounce_mode: "natural", difficulty_score_threshold: 3 };
    // Una opción que el servidor no devolvió en los valores (p. ej. de master) no se pinta.
    expect(opcionesDelGrupo(catalogo, "respuesta", valores).map((o) => o.clave)).toEqual([
      "debounce_mode",
      "difficulty_score_threshold",
    ]);
    expect(opcionesDelGrupo(catalogo, "horario", valores)).toEqual([]);
    // La palabra de baja y la zona del horario tienen su propia pantalla o se unifican.
    const propias: CatalogoConfig = {
      version: "x",
      opciones: [
        { ...velocidad, clave: "palabras_de_baja", grupo: "bajas" },
        { ...velocidad, clave: "business_tz", grupo: "horario" },
      ],
    };
    expect(opcionesDelGrupo(propias, "bajas", { palabras_de_baja: [] })).toEqual([]);
    expect(opcionesDelGrupo(propias, "horario", { business_tz: "UTC" })).toEqual([]);
  });

  it("junta los errores de rango por campo", () => {
    expect(erroresDeRango(catalogo, { difficulty_score_threshold: 11 })).toEqual({
      difficulty_score_threshold: "«Puntaje para razonamiento» debe estar entre 1 y 10.",
    });
    expect(erroresDeRango(catalogo, { difficulty_score_threshold: 4 })).toEqual({});
  });
});
