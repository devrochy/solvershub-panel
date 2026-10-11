import { describe, expect, it } from "vitest";

import {
  agruparEnOtros,
  CLAVE_OTROS,
  dominioY,
  escalaBandas,
  escalaX,
  escalaY,
  fechaCorta,
  formateadorY,
  formatoCompacto,
  indiceCercano,
  indicesDeEtiquetas,
  pathArea,
  pathBarra,
  pathLinea,
  ranuraDeColor,
  resumenSerie,
  ticksY,
} from "./escalas";

/**
 * Casos compartidos de HU-DS-06: la app (`src/shared/dataviz`) corre estos mismos números
 * contra su copia de `escalas.ts`. Si cambia uno aquí, cambia allá.
 */

describe("dominioY y ticks", () => {
  it("incluye el cero y redondea a ticks limpios", () => {
    expect(dominioY([12, 87, 45])).toEqual([0, 100]);
    expect(dominioY([1230, 4870])).toEqual([0, 5000]);
    expect(dominioY([-15, 40])).toEqual([-20, 40]);
  });

  it("sin cero (opcional) se ajusta a los datos", () => {
    expect(dominioY([102, 118], { incluirCero: false })).toEqual([100, 120]);
    expect(dominioY([5, 5], { incluirCero: false })).toEqual([4.4, 5.6]);
  });

  it("casos borde: sin datos, todo en cero o valores que faltan", () => {
    expect(dominioY([])).toEqual([0, 1]);
    expect(dominioY([0, 0])).toEqual([0, 1]);
    expect(dominioY([null, undefined, Number.NaN])).toEqual([0, 1]);
    expect(dominioY([5, 5])).toEqual([0, 5]);
  });

  it("los ticks son números redondos", () => {
    expect(ticksY([0, 100])).toEqual([0, 20, 40, 60, 80, 100]);
    expect(ticksY([0, 5000])).toEqual([0, 1000, 2000, 3000, 4000, 5000]);
  });
});

describe("escalas X", () => {
  it("la X por posición reparte los puntos en el rango", () => {
    const x = escalaX(3, [0, 100]);
    expect([x(0), x(1), x(2)]).toEqual([0, 50, 100]);
  });

  it("el crosshair se ajusta al punto más cercano y no se sale", () => {
    const x = escalaX(3, [0, 100]);
    expect(indiceCercano(48, 3, x)).toBe(1);
    expect(indiceCercano(80, 3, x)).toBe(2);
    expect(indiceCercano(-20, 3, x)).toBe(0);
    expect(indiceCercano(500, 3, x)).toBe(2);
    expect(indiceCercano(5, 0, x)).toBe(-1);
  });

  it("las bandas de barras dejan aire entre grupos", () => {
    const b = escalaBandas(4, [0, 400]);
    expect(b("0")).toBe(15);
    expect(b.bandwidth()).toBe(70);
    expect(b.step()).toBe(100);
  });

  it("etiquetas del eje X: como mucho `maximo`, con la primera y la última", () => {
    expect(indicesDeEtiquetas(5, 6)).toEqual([0, 1, 2, 3, 4]);
    expect(indicesDeEtiquetas(7, 6)).toEqual([0, 2, 4, 6]);
    expect(indicesDeEtiquetas(30, 6)).toEqual([0, 6, 12, 18, 24, 29]);
    expect(indicesDeEtiquetas(12, 4)).toEqual([0, 4, 8, 11]);
    expect(indicesDeEtiquetas(0)).toEqual([]);
  });
});

describe("paths", () => {
  const x = escalaX(3, [0, 100]);
  const y = escalaY([0, 100], [100, 0]);

  it("línea de tramos rectos", () => {
    expect(pathLinea([0, 100, 50], x, y)).toBe("M0,100L50,0L100,50");
  });

  it("la línea se corta donde falta el valor (no inventa un cero)", () => {
    expect(pathLinea([10, 50, null], x, y)).toBe("M0,90L50,50");
    expect(pathLinea([0, null, 50, 60], escalaX(4, [0, 90]), y)).toBe("M0,100ZM60,50L90,40");
  });

  it("el área cierra contra la base", () => {
    expect(pathArea([0, 100, 50], x, y, 100)).toBe("M0,100L50,0L100,50L100,100L50,100L0,100Z");
  });

  it("barra: extremo redondeado de 4 px y base recta", () => {
    expect(pathBarra({ x: 10, ancho: 20, base: 100, tope: 40 })).toBe(
      "M10,100V44A4,4 0 0 1 14,40H26A4,4 0 0 1 30,44V100Z",
    );
  });

  it("barra negativa: crece hacia abajo y redondea abajo", () => {
    expect(pathBarra({ x: 10, ancho: 20, base: 50, tope: 80 })).toBe(
      "M10,50V76A4,4 0 0 0 14,80H26A4,4 0 0 0 30,76V50Z",
    );
  });

  it("barra más baja que el radio: el radio se achica; sin alto no hay barra", () => {
    expect(pathBarra({ x: 0, ancho: 6, base: 10, tope: 8 })).toBe("M0,10V10A2,2 0 0 1 2,8H4A2,2 0 0 1 6,10V10Z");
    expect(pathBarra({ x: 0, ancho: 6, base: 10, tope: 10 })).toBe("");
  });
});

describe("color por entidad", () => {
  const series = [
    { key: "whatsapp", label: "WhatsApp" },
    { key: "web", label: "Web" },
    { key: "instagram", label: "Instagram" },
  ];

  it("la ranura sale de la lista declarada, no de las visibles", () => {
    expect(ranuraDeColor("whatsapp", series)).toBe(0);
    expect(ranuraDeColor("instagram", series)).toBe(2);
    expect(ranuraDeColor("otra", series)).toBe(-1);
  });

  it("una sola serie declarada usa el color de serie única", () => {
    expect(ranuraDeColor("whatsapp", series.slice(0, 1))).toBe("unica");
  });

  it("desde la 5.ª serie se suman en «Otros» (nunca un 5.º color)", () => {
    const muchas = ["a", "b", "c", "d", "e", "f"].map((k) => ({ key: k, label: k.toUpperCase() }));
    const { series: agrupadas, datos } = agruparEnOtros(muchas, [
      { x: "2026-10-01", values: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 } },
      { x: "2026-10-02", values: { a: 1, b: 2, c: 3, d: 4, e: null } },
    ]);
    expect(agrupadas.map((s) => s.key)).toEqual(["a", "b", "c", "d", CLAVE_OTROS]);
    expect(agrupadas[4].label).toBe("Otros");
    expect(datos[0].values[CLAVE_OTROS]).toBe(11);
    expect(datos[1].values[CLAVE_OTROS]).toBeNull();
    expect(ranuraDeColor(CLAVE_OTROS, agrupadas)).toBe("otros");
  });
});

describe("formato es-CO", () => {
  it("cifras cortas para los ticks", () => {
    expect([950, 1500, 250000, 1200000, 3e9, -2500, 0].map(formatoCompacto)).toEqual([
      "950",
      "1,5 mil",
      "250 mil",
      "1,2 M",
      "3 mil M",
      "-2,5 mil",
      "0",
    ]);
  });

  it("formatos del eje Y: completo para tooltip y tabla, corto para ticks", () => {
    expect(formateadorY()(1234.567)).toBe("1.234,57");
    expect(formateadorY("currency")(1234567.6)).toBe("$ 1.234.568");
    expect(formateadorY("currency", { compacto: true })(1500000)).toBe("$ 1,5 M");
    expect(formateadorY("percent")(12.5)).toBe("12,5 %");
    const propio = (v: number) => `${v} u`;
    expect(formateadorY(propio, { compacto: true })).toBe(propio);
  });

  it("fechas cortas sin corrimiento de zona horaria", () => {
    expect(fechaCorta("2026-10-05")).toBe("5 oct");
    expect(fechaCorta("2026-01-31T10:00:00Z")).toBe("31 ene");
    expect(fechaCorta("Semana 3")).toBe("Semana 3");
  });

  it("resumen de una serie para lectores de pantalla", () => {
    expect(resumenSerie([120, 100, 190, 180])).toBe("de 120 a 180, mínimo 100 y máximo 190");
    expect(resumenSerie([])).toBe("sin datos");
  });
});
