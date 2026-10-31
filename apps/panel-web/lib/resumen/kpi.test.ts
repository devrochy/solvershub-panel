import { describe, expect, it } from "vitest";

import type { KpiResumen } from "@/lib/api/types";
import { resumenPorAgente } from "@/lib/testing/fixtures";

import { deltaDeKpi, propsDeKpi, valorDeKpi } from "./kpi";

function kpi(parcial: Partial<KpiResumen>): KpiResumen {
  return {
    id: "k",
    label: "KPI",
    valor: 0,
    unidad: "count",
    previo: null,
    delta_pct: null,
    polaridad: "up-good",
    ...parcial,
  };
}

describe("valorDeKpi", () => {
  it("formatea según la unidad", () => {
    expect(valorDeKpi(kpi({ valor: 1280, unidad: "count" }))).toBe(new Intl.NumberFormat("es-CO").format(1280));
    expect(valorDeKpi(kpi({ valor: 12.5, unidad: "pct" }))).toMatch(/^12,5\s?%$/);
    expect(valorDeKpi(kpi({ valor: 0.03, unidad: "usd" }))).toContain("0,03");
    expect(valorDeKpi(kpi({ valor: 300000, unidad: "money" }))).toMatch(/\$\s?300\.000/);
  });

  it("sin datos suficientes muestra una raya, no un cero", () => {
    expect(valorDeKpi(kpi({ valor: null, unidad: "pct" }))).toBe("—");
  });
});

describe("deltaDeKpi", () => {
  it("dice contra qué compara", () => {
    expect(deltaDeKpi(kpi({ delta_pct: 20 }))).toEqual({ value: 20, versus: "los 7 días anteriores" });
    expect(deltaDeKpi(kpi({ delta_pct: -5, versus: "el mes anterior" }))).toEqual({
      value: -5,
      versus: "el mes anterior",
    });
    expect(deltaDeKpi(kpi({ delta_pct: 10 }), 15)).toEqual({
      value: 10,
      versus: "los 15 días anteriores",
    });
  });

  it("sin variación calculable no hay delta", () => {
    expect(deltaDeKpi(kpi({ delta_pct: null }))).toBeUndefined();
  });
});

describe("propsDeKpi", () => {
  it("lleva polaridad, pista y enlace del destino", () => {
    const props = propsDeKpi(
      kpi({
        id: "cartera_en_mora",
        label: "Cartera en mora",
        valor: 500,
        unidad: "money",
        polaridad: "up-bad",
        hint: "Cuotas atrasadas ahora",
        destino: { ruta: "cobranza.carteras", params: { mora: "1" } },
      }),
    );
    expect(props).toMatchObject({
      label: "Cartera en mora",
      polarity: "up-bad",
      hint: "Cuotas atrasadas ahora",
      href: "/cobranza/carteras",
      tone: "default",
    });
  });

  it("todas las cifras del Resumen de prueba llevan a una pantalla", () => {
    const kpis = [
      ...resumenPorAgente.general.kpis,
      ...resumenPorAgente.agentes.flatMap((a) => [
        ...a.kpis,
        ...a.modulos.flatMap((m) => m.kpis),
      ]),
    ];
    expect(kpis.length).toBeGreaterThan(0);
    for (const k of kpis) expect(propsDeKpi(k).href, k.id).toBeDefined();
  });

  it("las escalaciones pendientes piden atención en cuanto hay alguna", () => {
    expect(propsDeKpi(kpi({ id: "escalaciones_pendientes", valor: 2 })).tone).toBe("warning");
    expect(propsDeKpi(kpi({ id: "escalaciones_pendientes", valor: 0 })).tone).toBe("default");
  });
});
