import { describe, expect, it } from "vitest";

import type {
  PruebasEscenarioInforme,
  PruebasEstimado,
  PruebasIntento,
} from "@/lib/api/types";

import {
  avanceDeEscenario,
  corridaEnCurso,
  creditosQueFaltan,
  criteriosDeTexto,
  estadoDeCorrida,
  estimadoDeK,
  mensajeDeError,
  motivoNoAplicable,
  opcionesDeK,
  porcentajeDeAvance,
  pruebasHabilitadas,
  resultadoDeEscenario,
  textoDeProbar,
} from "./pruebas-del-agente";

const intento = (
  n: number,
  estado: PruebasIntento["estado"],
  extra: Partial<PruebasIntento> = {},
): PruebasIntento => ({
  result_id: `r${n}`,
  intento: n,
  estado,
  fin: "objetivo",
  criterio_incumplido: null,
  razon: null,
  transcripcion: [],
  tools_llamadas: [],
  arreglo: null,
  arreglo_aplicado_en: null,
  juez_equivocado: false,
  ...extra,
});
const escenario = (intentos: PruebasIntento[]): PruebasEscenarioInforme => ({
  case_id: "c",
  titulo: "T",
  intentos,
});

const ESTIMADO: PruebasEstimado = {
  escenarios: 2,
  nivel_ia: "estandar",
  k_por_defecto: 1,
  k_maximo: 3,
  saldo: 100,
  cuota_gratis_restante: 50,
  por_k: [
    {
      k: 1,
      estimado: 80,
      de_la_cuota: 50,
      del_saldo: 30,
      saldo_despues: 70,
      alcanza: true,
    },
    {
      k: 2,
      estimado: 160,
      de_la_cuota: 50,
      del_saldo: 110,
      saldo_despues: null,
      alcanza: false,
    },
    {
      k: 3,
      estimado: 240,
      de_la_cuota: 50,
      del_saldo: 190,
      saldo_despues: null,
      alcanza: false,
    },
  ],
};

describe("pestaña Pruebas: estados en palabras", () => {
  it("traduce cada estado de la corrida y sabe cuáles siguen vivos", () => {
    expect(estadoDeCorrida("en_cola").label).toBe("En cola");
    expect(estadoDeCorrida("corriendo").label).toBe("En curso");
    expect(estadoDeCorrida("cortada_por_tope").label).toBe(
      "Se detuvo al llegar al tope",
    );
    expect(estadoDeCorrida("fallo").label).toBe("No se pudo completar");
    expect(estadoDeCorrida("algo_nuevo").label).toBe("Sin estado");
    expect(["en_cola", "corriendo"].every(corridaEnCurso)).toBe(true);
    expect(
      ["terminada", "cancelada", "cortada_por_tope", "fallo"].some(
        corridaEnCurso,
      ),
    ).toBe(false);
  });

  it("la bandera del panel se lee de la variable de entorno y por defecto está apagada", () => {
    expect(pruebasHabilitadas(undefined)).toBe(false);
    expect(pruebasHabilitadas("0")).toBe(false);
    expect(pruebasHabilitadas("1")).toBe(true);
    expect(pruebasHabilitadas("true")).toBe(true);
  });

  it("el motivo por el que no se aplica un arreglo va en palabras", () => {
    expect(motivoNoAplicable("tipo", "Lo que sabe")).toBe(
      "Este arreglo se hace a mano, en Lo que sabe.",
    );
    expect(motivoNoAplicable("sin_borrador")).toMatch(/no tiene un borrador/);
    expect(motivoNoAplicable("ya_aplicado")).toMatch(/ya está/);
    expect(motivoNoAplicable(null)).toBeNull();
  });

  it("los errores de la API salen en español y sin el código", () => {
    expect(
      mensajeDeError({ code: "estimado_cambio", error: "x" }, "n"),
    ).not.toMatch(/estimado_cambio/);
    expect(mensajeDeError({ code: "corrida_en_curso" }, "n")).toMatch(
      /corrida en marcha/,
    );
    expect(
      mensajeDeError({ code: "otro", error: "Mensaje del servidor" }, "n"),
    ).toBe("Mensaje del servidor");
    expect(mensajeDeError(null, "Respaldo")).toBe("Respaldo");
  });
});

describe("el costo de cada k", () => {
  it("elige la fila del k y ofrece de 1 al tope", () => {
    expect(opcionesDeK(ESTIMADO)).toEqual([1, 2, 3]);
    expect(estimadoDeK(ESTIMADO, 2)?.estimado).toBe(160);
    expect(estimadoDeK(ESTIMADO, 9)?.k).toBe(3);
    expect(estimadoDeK(null, 1)).toBeNull();
  });

  it("cuántos créditos faltan cuando no alcanza", () => {
    expect(creditosQueFaltan(ESTIMADO, 1)).toBe(0);
    expect(creditosQueFaltan(ESTIMADO, 2)).toBe(10);
    expect(creditosQueFaltan(ESTIMADO, 3)).toBe(90);
  });
});

describe("el resultado de un escenario", () => {
  it("sin intentos, sin probar", () => {
    expect(resultadoDeEscenario(undefined).estado).toBe("sin_probar");
    expect(resultadoDeEscenario(escenario([])).estado).toBe("sin_probar");
  });

  it("con k = 1 dice «Pasó» o «Falló»; con varios, cuántas pasaron", () => {
    expect(resultadoDeEscenario(escenario([intento(1, "pasa")])).label).toBe(
      "Pasó",
    );
    expect(resultadoDeEscenario(escenario([intento(1, "falla")])).label).toBe(
      "Falló",
    );
    const mixto = resultadoDeEscenario(
      escenario([intento(1, "pasa"), intento(2, "falla"), intento(3, "pasa")]),
    );
    expect(mixto).toMatchObject({
      estado: "falla",
      label: "Pasó 2 de 3",
      pasaron: 2,
      total: 3,
    });
    expect(
      resultadoDeEscenario(escenario([intento(1, "pasa"), intento(2, "pasa")]))
        .estado,
    ).toBe("pasa");
    expect(
      resultadoDeEscenario(
        escenario([intento(1, "falla"), intento(2, "falla")]),
      ).label,
    ).toBe("Falló");
  });

  it("lo que no se pudo probar y lo que el dueño marcó «no es una falla» no cuentan", () => {
    expect(
      resultadoDeEscenario(escenario([intento(1, "no_se_pudo_probar")])).estado,
    ).toBe("no_se_pudo_probar");
    expect(
      resultadoDeEscenario(
        escenario([intento(1, "falla", { juez_equivocado: true })]),
      ).estado,
    ).toBe("pasa");
    expect(
      resultadoDeEscenario(
        escenario([
          intento(1, "pasa"),
          intento(2, "falla", { juez_equivocado: true }),
        ]),
      ).label,
    ).toBe("Pasó");
  });

  it("el avance en una corrida viva", () => {
    expect(avanceDeEscenario(escenario([]), 2).label).toBe("En cola");
    expect(avanceDeEscenario(escenario([intento(1, "pasa")]), 2).label).toBe(
      "Va en la repetición 2 de 2",
    );
    expect(
      avanceDeEscenario(escenario([intento(1, "pasa"), intento(2, "pasa")]), 2)
        .label,
    ).toBe("Terminado");
    expect(porcentajeDeAvance({ progreso: { hechos: 5, total: 8 } })).toBe(63);
    expect(porcentajeDeAvance({ progreso: { hechos: 0, total: 0 } })).toBe(0);
  });
});

describe("textos del formulario y de la lista", () => {
  it("un criterio por línea, sin vacíos ni repetidos", () => {
    expect(criteriosDeTexto(" a \n\nb\na\n")).toEqual(["a", "b"]);
  });
  it("el botón de la lista", () => {
    expect(textoDeProbar(1)).toBe("Probar 1 aprobado");
    expect(textoDeProbar(8)).toBe("Probar 8 aprobados");
  });
});
