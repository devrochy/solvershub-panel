import { describe, expect, it } from "vitest";

import type { PlanOut } from "@/lib/api/types";
import {
  PLAN_VACIO,
  avisoDeMinimo,
  confirmacionDeAccionDePlan,
  cuerpoConEstado,
  cuerpoDePlan,
  estadoDelPlan,
  formularioDePlan,
  permiteProbar,
  textoDePrueba,
} from "@/lib/planes";

const plan: PlanOut = {
  id: "p1", codigo: "PLAN-PRO", nombre: "Plan Pro", descripcion: "Para crecer", precio: 200000, moneda: "COP",
  periodicidad: "mensual", trial_dias: 0, entitlements: { clientes: 500 }, plan_plataforma: "pro", activo: true, orden: 3,
};

describe("aviso del plan bajo el mínimo (HU-SUB-25)", () => {
  const sandbox = { minimo: 150_000, cuentas_de_transferencia: 1 };

  it("avisa cuando el precio por período queda bajo el mínimo y no bloquea", () => {
    const aviso = avisoDeMinimo({ precio: 80_000, periodo: "mensual" }, sandbox);
    expect(aviso?.mensaje).toMatch(/80\.000[\s\S]*150\.000[\s\S]*no podrá tener link de pago[\s\S]*transferencia/);
    expect(aviso?.sinCuentas).toBe(false);
  });

  it("ofrece trimestral o anual con la cuenta hecha si llegan al mínimo", () => {
    const aviso = avisoDeMinimo({ precio: 80_000, periodo: "mensual" }, sandbox);
    expect(aviso?.alternativas).toEqual([
      { value: "trimestral", label: "Trimestral", precio: 240_000 },
      { value: "anual", label: "Anual", precio: 960_000 },
    ]);
  });

  it("solo ofrece las periodicidades que sí llegan al mínimo", () => {
    const aviso = avisoDeMinimo({ precio: 40_000, periodo: "mensual" }, sandbox);
    expect(aviso?.alternativas.map((a) => a.value)).toEqual(["anual"]); // ×3 = 120.000 < 150.000
    expect(avisoDeMinimo({ precio: 1_000, periodo: "mensual" }, sandbox)?.alternativas).toEqual([]);
  });

  it("un trimestral sugiere el anual (×4), nunca uno más corto", () => {
    const aviso = avisoDeMinimo({ precio: 40_000, periodo: "trimestral" }, sandbox);
    expect(aviso?.alternativas).toEqual([{ value: "anual", label: "Anual", precio: 160_000 }]);
  });

  it("el mínimo sale del servidor: en producción (1.500) el mismo plan ya no avisa", () => {
    expect(avisoDeMinimo({ precio: 80_000, periodo: "mensual" }, { minimo: 1_500, cuentas_de_transferencia: 1 })).toBeNull();
  });

  it("sin aviso para periodicidad desconocida, plan gratis, precio suficiente, sin pasarela o mínimo apagado", () => {
    expect(avisoDeMinimo({ precio: 80_000, periodo: "" }, sandbox)).toBeNull();
    expect(avisoDeMinimo({ precio: 0, periodo: "mensual" }, sandbox)).toBeNull();
    expect(avisoDeMinimo({ precio: 150_000, periodo: "mensual" }, sandbox)).toBeNull();
    expect(avisoDeMinimo({ precio: 80_000, periodo: "mensual" }, { minimo: null, cuentas_de_transferencia: 0 })).toBeNull();
    expect(avisoDeMinimo({ precio: 80_000, periodo: "mensual" }, { minimo: 0, cuentas_de_transferencia: 0 })).toBeNull();
    expect(avisoDeMinimo({ precio: 80_000, periodo: "mensual" }, null)).toBeNull();
    expect(avisoDeMinimo({ precio: Number.NaN, periodo: "mensual" }, sandbox)).toBeNull();
  });

  it("dice cuando el negocio no tiene cuentas de transferencia", () => {
    expect(avisoDeMinimo({ precio: 80_000, periodo: "mensual" }, { minimo: 150_000, cuentas_de_transferencia: 0 })?.sinCuentas).toBe(true);
  });
});

describe("formulario del plan (HU-SUB-31)", () => {
  it("un plan nuevo arranca mensual, activo y sin precio", () => {
    expect(formularioDePlan(null)).toEqual(PLAN_VACIO);
    expect(PLAN_VACIO).toMatchObject({ periodicidad: "mensual", activo: true, precio: "0" });
  });

  it("al editar, el formulario trae los datos del plan", () => {
    expect(formularioDePlan(plan)).toEqual({
      codigo: "PLAN-PRO", nombre: "Plan Pro", descripcion: "Para crecer", precio: "200000",
      periodicidad: "mensual", trial_dias: "0", activo: true,
    });
  });

  it("la prueba solo se permite con precio $0 (D-16)", () => {
    expect(permiteProbar("0")).toBe(true);
    expect(permiteProbar("0.00")).toBe(true);
    expect(permiteProbar("1")).toBe(false);
    expect(permiteProbar("")).toBe(false);
    expect(permiteProbar("abc")).toBe(false);
  });

  it("arma el cuerpo de un plan nuevo con la moneda del negocio", () => {
    const r = cuerpoDePlan({ ...PLAN_VACIO, codigo: " PLAN-FREE ", nombre: " Free ", trial_dias: "30" }, null, "COP");
    expect(r).toEqual({
      cuerpo: {
        codigo: "PLAN-FREE", nombre: "Free", descripcion: "", precio: 0, moneda: "COP", periodicidad: "mensual",
        trial_dias: 30, entitlements: {}, plan_plataforma: null, activo: true, orden: 0,
      },
    });
  });

  it("editar devuelve lo que el formulario no toca, porque PUT reemplaza el plan", () => {
    const r = cuerpoDePlan({ ...formularioDePlan(plan), precio: "250000" }, plan);
    expect(r).toMatchObject({
      cuerpo: { precio: 250000, moneda: "COP", entitlements: { clientes: 500 }, plan_plataforma: "pro", orden: 3, activo: true },
    });
  });

  it("rechaza lo que el servidor rechazaría, con texto en español", () => {
    const base = { ...PLAN_VACIO, codigo: "A", nombre: "A" };
    expect(cuerpoDePlan({ ...base, codigo: " " }, null)).toEqual({ error: "Escribe el código del plan." });
    expect(cuerpoDePlan({ ...base, nombre: "" }, null)).toEqual({ error: "Escribe el nombre del plan." });
    expect(cuerpoDePlan({ ...base, precio: "-1" }, null)).toMatchObject({ error: expect.stringMatching(/precio/) });
    expect(cuerpoDePlan({ ...base, precio: "" }, null)).toMatchObject({ error: expect.stringMatching(/precio/) });
    expect(cuerpoDePlan({ ...base, periodicidad: "semanal" }, null)).toMatchObject({ error: expect.stringMatching(/periodicidad/) });
    expect(cuerpoDePlan({ ...base, trial_dias: "1.5" }, null)).toMatchObject({ error: expect.stringMatching(/entero/) });
    expect(cuerpoDePlan({ ...base, trial_dias: "400" }, null)).toMatchObject({ error: expect.stringMatching(/entre 0 y 365/) });
    expect(cuerpoDePlan({ ...base, precio: "99000", trial_dias: "14" }, null)).toEqual({
      error: "Solo un plan de $0 puede tener días de prueba.",
    });
  });

  it("desactivar conserva todo lo demás del plan", () => {
    expect(cuerpoConEstado(plan, false)).toEqual({
      codigo: "PLAN-PRO", nombre: "Plan Pro", descripcion: "Para crecer", precio: 200000, moneda: "COP",
      periodicidad: "mensual", trial_dias: 0, entitlements: { clientes: 500 }, plan_plataforma: "pro", activo: false, orden: 3,
    });
  });
});

describe("textos del plan", () => {
  it("la prueba y el estado se dicen en palabras", () => {
    expect(textoDePrueba({ trial_dias: 0 })).toBe("Sin prueba");
    expect(textoDePrueba({ trial_dias: 1 })).toBe("1 día");
    expect(textoDePrueba({ trial_dias: 30 })).toBe("30 días");
    expect(estadoDelPlan({ activo: true })).toBe("activo");
    expect(estadoDelPlan({ activo: false })).toBe("inactivo");
  });

  it("cada acción explica qué pasa con quienes ya están inscritos; solo eliminar es destructiva", () => {
    expect(confirmacionDeAccionDePlan("desactivar", plan)).toMatchObject({ destructive: false, description: expect.stringMatching(/siguen pagando/) });
    expect(confirmacionDeAccionDePlan("activar", plan).destructive).toBe(false);
    const eliminar = confirmacionDeAccionDePlan("eliminar", plan);
    expect(eliminar.destructive).toBe(true);
    expect(eliminar.description).toMatch(/siguen cobrándose/);
    expect(eliminar.title).toBe("¿Eliminar «Plan Pro»?");
  });
});
