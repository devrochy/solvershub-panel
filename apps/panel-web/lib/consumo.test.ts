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
    expect(c.aviso?.texto).toBe("A este ritmo alcanza hasta el 14 de nov., y se renueva el 19 de nov. Si se acaba, las conversaciones pasan a tu equipo: conviene mejorar el plan.");
    expect(creditoEnPalabras(credito(48500, 81, -27, 3), AHORA)!.aviso?.texto).toMatch(/^A este ritmo te alcanza/);
  });

  it("agotado o sin medición", () => {
    const agotado = creditoEnPalabras(credito(61000, 101.6), AHORA)!;
    expect(agotado).toMatchObject({ titulo: "Usaste todo el crédito del mes", tono: "danger" });
    // HU-BILL-20: sin saldo el turno corta y pasa a una persona; ya no «sigue respondiendo».
    expect(agotado.aviso?.texto).toMatch(/^Las conversaciones nuevas pasan a una persona de tu equipo; las que estaban en curso siguen con una reserva pequeña\./);
    expect(agotado.aviso?.texto).not.toMatch(/sigue respondiendo/);
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
    expect(topeEnPalabras(uso("colaboradores", 4, 10)).nota).toBe("Puedes invitar a 6 más");
    expect(topeEnPalabras(uso("clientes", 1240, null))).toMatchObject({ uso: "1.240, sin límite", porcentaje: null, mejorar: false });
  });

  it("conexiones y correos (HU-BILL-19) con «X de Y» y qué pasa al llegar", () => {
    expect(topeEnPalabras(uso("conexiones", 1, 2))).toMatchObject({ titulo: "Conexiones de canales", uso: "1 de 2", nota: "Queda 1 conexión", tono: "info", mejorar: false });
    expect(topeEnPalabras(uso("conexiones", 6, 6))).toMatchObject({ uso: "6 de 6", nota: "No puedes agregar otra conexión", tono: "danger", mejorar: true });
    expect(topeEnPalabras(uso("correos", 1, 3))).toMatchObject({ titulo: "Correos conectados", uso: "1 de 3", nota: "Quedan 2 correos" });
    expect(topeEnPalabras(uso("correos", 1, 1)).nota).toBe("No puedes conectar otro correo");
  });

  it("un tope en cero es algo que el plan no incluye, no un tope lleno", () => {
    // Free trae `correos: 0` y el backend lo manda con `percent: 100`.
    expect(topeEnPalabras(uso("correos", 0, 0, 100))).toMatchObject({ uso: "No incluido", porcentaje: null, nota: "Tu plan no incluye correos", tono: "neutral", mejorar: true });
  });

  it("solo los topes estructurales, en orden fijo, sin las métricas de volumen de v1", () => {
    const usage = [
      uso("correos", 0, 1),
      uso("conversaciones", 812, 1500),
      uso("clientes", 1, null),
      uso("conexiones", 1, 2),
      uso("mensajes", 10, 100),
      uso("colaboradores", 4, 10),
      uso("conversaciones_audio", 96, 100),
      uso("agentes", 3, 3),
    ];
    expect(topesEnPalabras(usage).map((t) => t.clave)).toEqual(["agentes", "colaboradores", "clientes", "conexiones", "correos"]);
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
    expect(limiteEnPalabras("agentes", 1)).toBe("1 agente");
    expect(limiteEnPalabras("colaboradores", null)).toBe("Personas sin límite");
    expect(limiteEnPalabras("conexiones", 6)).toBe("6 conexiones");
    expect(limiteEnPalabras("conexiones", 1)).toBe("1 conexión");
    expect(limiteEnPalabras("correos", 0)).toBe("Sin correos");
    expect(limiteEnPalabras("conocimiento_mb", 500)).toBe("500 MB para documentos");
    // Claves que no son del catálogo v3: el texto si lo traen, o el nombre de la clave.
    expect(funcionesEnPalabras({ soporte: "Soporte por WhatsApp", reportes: true, multi_negocio: true, apagada: false })).toEqual(["Soporte por WhatsApp", "Reportes", "Varios negocios"]);
  });

  it("los beneficios del catálogo v3 en palabras simples (HU-BILL-18)", () => {
    const free = { canales: ["whatsapp", "web"], nivel_ia: "estandar", byok: false, acumulable_meses: 0, descuento_recarga: null, marca_propia: false, historial_dias: 30, campanas: "ninguna", soporte: "comunidad" };
    expect(funcionesEnPalabras(free)).toEqual(["Atiende por WhatsApp y chat web", "Historial de 30 días", "Soporte en la comunidad"]);
    const basic = { ...free, canales: ["whatsapp", "web", "telegram"], descuento_recarga: 0, historial_dias: 90, campanas: "recordatorios", soporte: "email" };
    expect(funcionesEnPalabras(basic)).toEqual([
      "Atiende por WhatsApp, chat web y Telegram",
      "Puedes comprar créditos extra",
      "Historial de 90 días",
      "Recordatorios a tus clientes",
      "Soporte por correo",
    ]);
    const premium = {
      canales: ["whatsapp", "web", "telegram", "instagram", "messenger"],
      nivel_ia: "avanzado",
      byok: false,
      acumulable_meses: 1,
      descuento_recarga: 15,
      marca_propia: true,
      historial_dias: 365,
      campanas: "completas",
      soporte: "prioritario",
    };
    expect(funcionesEnPalabras(premium)).toEqual([
      "Atiende por WhatsApp, chat web, Telegram, Instagram y Messenger",
      "IA Avanzada para tus agentes",
      "El crédito que no uses pasa al mes siguiente",
      "15 % de descuento al comprar créditos",
      "Tu marca, sin la de SolversHub",
      "Historial de 1 año",
      "Campañas a tus clientes",
      "Soporte prioritario",
    ]);
    const empresarial = { ...premium, byok: true, acumulable_meses: 2, descuento_recarga: 25, historial_dias: null, soporte: "dedicado" };
    expect(funcionesEnPalabras(empresarial)).toEqual(
      expect.arrayContaining(["El crédito que no uses se guarda hasta 2 meses", "25 % de descuento al comprar créditos", "Historial sin límite", "Conecta tu propia cuenta de IA", "Soporte dedicado"]),
    );
    // Nada de «Byok», «Ninguna» ni claves crudas.
    expect(funcionesEnPalabras(empresarial).join(" ")).not.toMatch(/byok|ninguna|_/i);
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
