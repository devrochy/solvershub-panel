import { describe, expect, it } from "vitest";

import { avisoDeMinimo, cuerpoDelPlan, filtrarPorTipo, planDelProducto, textoEstado } from "@/lib/suscripciones";

const base = {
  configurado: null,
  efectivo: null,
  habilitados: [
    { id: "pack_subscriptions", label: "Suscripciones" },
    { id: "pack_cobranza", label: "Cobranza" },
  ],
  mensaje: "",
};

describe("proveedor de suscripciones (HU-SUB-09)", () => {
  it("dice con qué habilidad se cobran los planes", () => {
    expect(textoEstado({ ...base, estado: "ok", efectivo: "pack_cobranza" })).toBe(
      "Los planes se cobran con Cobranza.",
    );
  });

  it("muestra el motivo cuando no hay un proveedor claro", () => {
    const mensaje = "Hay más de un proveedor. Elige uno en la configuración del negocio.";
    expect(textoEstado({ ...base, estado: "ambiguo", mensaje })).toBe(mensaje);
  });
});

describe("cuerpo del plan del producto", () => {
  it("venta única y prueba vacía no cambian nada", () => {
    const data = new FormData();
    data.set("billing_period", "");
    data.set("trial_days", "");
    expect(cuerpoDelPlan(data)).toEqual({ billing_period: "", trial_days: null });
  });

  it("plan mensual con prueba", () => {
    const data = new FormData();
    data.set("billing_period", "mensual");
    data.set("trial_days", "30");
    expect(cuerpoDelPlan(data)).toEqual({ billing_period: "mensual", trial_days: 30 });
  });
});

describe("productos que son plan (HU-SUB-21)", () => {
  const camisa = { name: "Camisa", variants: [{ billing_period: null }] };
  const pro = { name: "Plan Pro", variants: [{ billing_period: "mensual" }, { billing_period: "mensual" }] };
  const mixto = { name: "Plan Max", variants: [{ billing_period: "mensual" }, { billing_period: "anual" }] };

  it("etiqueta la recurrencia sin repetirla", () => {
    expect(planDelProducto(camisa.variants)).toBeNull();
    expect(planDelProducto(pro.variants)).toBe("Plan mensual");
    expect(planDelProducto(mixto.variants)).toBe("Plan mensual · Plan anual");
    expect(planDelProducto([{ billing_period: "semanal" }])).toBe("Plan semanal");
  });

  it("filtra por planes o por venta única", () => {
    const todos = [camisa, pro, mixto];
    expect(filtrarPorTipo(todos, "planes").map((p) => p.name)).toEqual(["Plan Pro", "Plan Max"]);
    expect(filtrarPorTipo(todos, "unica").map((p) => p.name)).toEqual(["Camisa"]);
    expect(filtrarPorTipo(todos, undefined)).toHaveLength(3);
    expect(filtrarPorTipo(todos, "otra cosa")).toHaveLength(3);
  });
});

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
      { value: "trimestral", label: "Plan trimestral", precio: 240_000 },
      { value: "anual", label: "Plan anual", precio: 960_000 },
    ]);
  });

  it("solo ofrece los planes que sí llegan al mínimo", () => {
    const aviso = avisoDeMinimo({ precio: 40_000, periodo: "mensual" }, sandbox);
    expect(aviso?.alternativas.map((a) => a.value)).toEqual(["anual"]); // ×3 = 120.000 < 150.000
    expect(avisoDeMinimo({ precio: 1_000, periodo: "mensual" }, sandbox)?.alternativas).toEqual([]);
  });

  it("un trimestral sugiere el anual (×4), nunca uno más corto", () => {
    const aviso = avisoDeMinimo({ precio: 40_000, periodo: "trimestral" }, sandbox);
    expect(aviso?.alternativas).toEqual([{ value: "anual", label: "Plan anual", precio: 160_000 }]);
  });

  it("el mínimo sale del servidor: en producción (1.500) el mismo plan ya no avisa", () => {
    expect(avisoDeMinimo({ precio: 80_000, periodo: "mensual" }, { minimo: 1_500, cuentas_de_transferencia: 1 })).toBeNull();
  });

  it("sin aviso para venta única, plan gratis, precio suficiente, sin pasarela o mínimo apagado", () => {
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
