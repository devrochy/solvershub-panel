import { describe, expect, it } from "vitest";

import { cuerpoDelPlan, filtrarPorTipo, planDelProducto, textoEstado } from "@/lib/suscripciones";

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
