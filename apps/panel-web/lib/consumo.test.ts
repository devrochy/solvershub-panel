import { describe, expect, it } from "vitest";

import {
  accionDePlan,
  canalDelPago,
  creditoEnPalabras,
  creditoPorAgente,
  creditoPorConcepto,
  estadoDelPago,
  estadoDelPlan,
  funcionesEnPalabras,
  limiteEnPalabras,
  mesDelPago,
  nombreDelPlan,
  precioDelPlan,
  topeEnPalabras,
  topesEnPalabras,
} from "@/lib/consumo";

const AHORA = new Date(2026, 10, 10, 12, 0);
const dia = (n: number) => new Date(2026, 10, 10 + n, 12).toISOString();
const credito = (used: number | null, percent: number | null, inicio = -21, fin = 9) => ({
  limit: 60000,
  used,
  percent,
  period_start: dia(inicio),
  period_end: dia(fin),
  by_concept: {},
  by_agent: [],
  by_agent_truncated: false,
});

describe("el crédito en palabras (CYP-02)", () => {
  it("dice lo que queda, en pesos y para cuántos días", () => {
    const c = creditoEnPalabras(credito(30000, 50), AHORA)!;
    expect(c.titulo).toBe("Te quedan 30.000 créditos");
    expect(c.detalle).toMatch(/^unos \$\s300\.000 · para 9 días · usaste 30\.000 de 60\.000$/);
    expect(c.aviso).toBeNull();
    expect(c.tono).toBe("info");
  });

  it("desde el 80 % avisa con el ritmo: cuándo se acaba si no alcanza", () => {
    const c = creditoEnPalabras(credito(50412.5, 84), AHORA)!;
    expect(c.titulo).toBe("Te quedan 9.588 créditos");
    expect(c.aviso?.titulo).toBe("Vas al 84 % y faltan 9 días");
    // 50.412 en 21 días son 2.400 al día: los 9.588 alcanzan para 4 días, hasta el 14.
    expect(c.aviso?.texto).toBe("A este ritmo alcanza hasta el 14 de nov., y se renueva el 19 de nov. Tu asistente sigue respondiendo, pero conviene mejorar el plan.");
    expect(creditoEnPalabras(credito(48500, 81, -27, 3), AHORA)!.aviso?.texto).toMatch(/^A este ritmo te alcanza/);
  });

  it("agotado o sin medición", () => {
    expect(creditoEnPalabras(credito(61000, 101.6), AHORA)).toMatchObject({ titulo: "Usaste todo el crédito del mes", tono: "danger" });
    expect(creditoEnPalabras(credito(null, null), AHORA)?.detalle).toMatch(/La medición del consumo llega pronto/);
    expect(creditoEnPalabras(null, AHORA)).toBeNull();
  });

  it("reparte el crédito por concepto y por agente, con «Otros» al final", () => {
    const c = { ...credito(100, 1), by_concept: { llm_turn: 80, stt: 20, vision: 0, raro: 0 }, by_agent: [{ agent_id: null, name: null, used: 30 }, { agent_id: "a1", name: "Ventas", used: 10 }, { agent_id: "a2", name: "Cobranza", used: 60 }] };
    expect(creditoPorConcepto(c)).toEqual([
      { nombre: "Respuestas del asistente (IA)", usado: 80, porcentaje: 80 },
      { nombre: "Notas de voz", usado: 20, porcentaje: 20 },
    ]);
    expect(creditoPorAgente(c).map((a) => `${a.nombre} ${a.porcentaje}`)).toEqual(["Cobranza 60", "Ventas 10", "Otros 30"]);
  });
});

describe("los topes dicen qué pasa (CYP-04)", () => {
  const uso = (key: string, used: number, limit: number | null, percent: number | null = limit ? (used / limit) * 100 : null) => ({ key, label: key, unit: "u", scope: "month", used, limit, percent, exceeded: false });

  it("al tope, cerca y sin límite", () => {
    expect(topeEnPalabras(uso("agentes", 3, 3))).toMatchObject({ uso: "3 de 3", nota: "No puedes publicar otro agente", tono: "danger", mejorar: true });
    expect(topeEnPalabras(uso("conversaciones_audio", 96, 100))).toMatchObject({ titulo: "Notas de voz del mes", nota: "Quedan 4 notas de voz este mes", tono: "warning" });
    expect(topeEnPalabras(uso("colaboradores", 4, 10)).nota).toBe("Puedes invitar a 6 más");
    expect(topeEnPalabras(uso("clientes", 1240, null))).toMatchObject({ uso: "1.240, sin límite", porcentaje: null, mejorar: false });
    expect(topesEnPalabras([uso("clientes", 1, null), uso("colaboradores", 4, 10), uso("agentes", 3, 3)]).map((t) => t.clave)).toEqual(["agentes", "colaboradores", "clientes"]);
  });
});

describe("el plan y los pagos en palabras (CYP-01, 05, 06)", () => {
  const plan = (id: string, name: string, price_cop: number, current = false) => ({ id, name, price_cop, is_free: price_cop === 0, current, limits: {}, features: {} });

  it("estado del plan", () => {
    const resumen = { plan_id: "pro", plan_name: "Pro", status: "active", operational: true, days_left: 9, has_plan: true };
    expect(estadoDelPlan(resumen, false)).toEqual({ label: "Al día", tono: "success" });
    expect(estadoDelPlan(resumen, true)).toEqual({ label: "Pago pendiente", tono: "warning" });
    expect(estadoDelPlan({ ...resumen, status: "past_due" }, true).label).toBe("Pago vencido");
    expect(estadoDelPlan(null, false).label).toBe("Sin plan");
  });

  it("los planes se comparan con su acción y en palabras", () => {
    const pro = plan("pro", "Pro", 249000, true);
    expect(accionDePlan(plan("empresa", "Empresa", 590000), pro)).toEqual({ tipo: "mejorar", label: "Mejorar a Empresa" });
    expect(accionDePlan(plan("basic", "Básico", 99000), pro)).toEqual({ tipo: "cambiar", label: "Cambiar a Básico" });
    expect(accionDePlan(pro, pro).tipo).toBe("actual");
    expect(accionDePlan(plan("free", "Gratis", 0), pro).tipo).toBe("gratis");
    expect(precioDelPlan(pro)).toMatch(/249\.000 al mes$/);
    expect(precioDelPlan({ is_free: true, price_cop: 0 })).toBe("Sin costo");
    expect(limiteEnPalabras("conversaciones", 1500)).toBe("1.500 conversaciones al mes");
    expect(limiteEnPalabras("agentes", 1)).toBe("1 agente");
    expect(limiteEnPalabras("colaboradores", null)).toBe("Personas sin límite");
    expect(funcionesEnPalabras({ soporte: "Soporte prioritario", reportes: true, multi_negocio: true, apagada: false })).toEqual(["Soporte prioritario", "Reportes", "Varios negocios"]);
  });

  it("los pagos por mes, con su canal y qué hacer si no pasó", () => {
    expect(mesDelPago({ periodo: "2026-11", created_at: "2026-11-09T00:00:00Z" })).toBe("Noviembre 2026");
    expect(mesDelPago({ periodo: null, created_at: "2026-09-15T12:00:00Z" })).toBe("Septiembre 2026");
    expect(canalDelPago("asistente")).toBe("Por el asistente de SolversHub");
    expect(canalDelPago("otro")).toBe("Pago registrado");
    expect(estadoDelPago("declined")).toMatchObject({ label: "Rechazado", explicacion: "El banco no lo aprobó." });
    expect(estadoDelPago("aprobado").label).toBe("Pagado");
    expect(nombreDelPlan("basic", [{ id: "basic", name: "Básico" }])).toBe("Básico");
    expect(nombreDelPlan("pro", [])).toBe("Pro");
  });
});
