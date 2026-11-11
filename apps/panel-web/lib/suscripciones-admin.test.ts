import { describe, expect, it } from "vitest";

import {
  actorVisible,
  avisoLabel,
  cambioProgramadoTexto,
  canalDePagoExterno,
  confirmacionDeAccion,
  confirmacionDeReenvio,
  conQuery,
  consultaClientesSuscripcion,
  consultaPagos,
  consultaSuscripciones,
  enlaceDePagina,
  mensajeDeReenvio,
  mensajeDePagoRegistrado,
  descripcionDeConfirmacionDePago,
  descripcionDeRegistroDePago,
  mensajeDePagoConfirmado,
  montosDeInscripcion,
  textoDeDescuentoVigente,
  ESTADOS_SUSCRIPCION,
  tipoDePagoLabel,
  mesLegible,
  nombreDelCliente,
  opcionesDePlanes,
  porcentaje,
  puedeAdministrar,
  resultadoDelAviso,
  retencion,
  textoDeMora,
  variacion,
} from "./suscripciones-admin";

const ID = "3f2c1a9e-7b4d-4c5e-8a6f-1d2e3f4a5b6c";

describe("filtros de las listas (SPEC-35)", () => {
  it("arma la query de suscripciones y descarta lo inválido", () => {
    const qs = consultaSuscripciones({
      estado: "pausada", plan: ID, periodicidad: "anual", con_mora: "1", q: "  ana ", cliente_id: ID, page: "2",
    });
    expect(Object.fromEntries(qs)).toEqual({
      estado: "pausada", plan_id: ID, periodicidad: "anual", con_mora: "true", q: "ana", cliente_id: ID, page: "2",
    });
    const malo = consultaSuscripciones({ estado: "inventado", plan: "no-es-uuid", periodicidad: "diaria", cliente_id: "x", page: "0" });
    expect(malo.size).toBe(0);
  });

  it("arma la query de pagos con fechas y vencidos", () => {
    const qs = consultaPagos({ estado: "pendiente", tipo: "cambio_plan", vencidos: "true", desde: "2026-10-01", hasta: "2026-10-31", suscripcion_id: ID });
    expect(Object.fromEntries(qs)).toEqual({
      estado: "pendiente", tipo: "cambio_plan", vencidos: "true", desde: "2026-10-01", hasta: "2026-10-31", suscripcion_id: ID,
    });
    expect(consultaPagos({ estado: "rechazado", desde: "31/10/2026", hasta: "ayer" }).size).toBe(0);
  });

  it("arma la query de clientes", () => {
    expect(Object.fromEntries(consultaClientesSuscripcion({ q: "beto", con_mora: "1", incluir_canceladas: "1" }))).toEqual({
      q: "beto", con_mora: "true", incluir_canceladas: "true",
    });
    expect(consultaClientesSuscripcion({}).size).toBe(0);
  });

  it("conserva los filtros al paginar", () => {
    const qs = consultaSuscripciones({ estado: "activa", page: "3" });
    expect(enlaceDePagina("/suscripciones/lista", qs, 4)).toBe("/suscripciones/lista?estado=activa&page=4");
    expect(conQuery(new URLSearchParams())).toBe("");
    expect(conQuery(new URLSearchParams({ a: "1" }))).toBe("?a=1");
  });
});

describe("textos en palabras del negocio", () => {
  it("dice la mora sin enums crudos", () => {
    expect(textoDeMora(null)).toBe("Sin mora");
    expect(textoDeMora(0)).toBe("Vence hoy");
    expect(textoDeMora(1)).toBe("1 día de mora");
    expect(textoDeMora(12)).toBe("12 días de mora");
  });

  it("muestra el nombre del cliente, o su teléfono si no tiene", () => {
    expect(nombreDelCliente({ nombre: " Ana ", telefono: "+57" })).toBe("Ana");
    expect(nombreDelCliente({ nombre: null, telefono: "+573000000002" })).toBe("+573000000002");
    expect(nombreDelCliente({})).toBe("Cliente sin nombre");
  });

  it("quien actuó sale de la auditoría sin el prefijo", () => {
    expect(actorVisible("admin:duena@test")).toBe("duena@test");
    expect(actorVisible("plugin:pack_subscriptions")).toBe("Automático");
  });

  it("variación, porcentaje y retención", () => {
    expect(variacion(400, 350)).toBeCloseTo(14.2857, 3);
    expect(variacion(5, 0)).toBeNull();
    expect(porcentaje(0.1667)).toBe("16,7 %");
    expect(porcentaje(null)).toBe("—");
    expect(retencion(4, 3)).toBe("75 %");
    expect(retencion(0, 0)).toBe("—");
    expect(mesLegible("2026-10")).toBe("octubre de 2026");
    expect(mesLegible("raro")).toBe("raro");
  });

  it("cuenta lo que se avisó y cómo salió", () => {
    expect(avisoLabel("subscription.charge_reminder")).toBe("Recordatorio de pago");
    expect(resultadoDelAviso({ estado_evento: "entregado", mensaje_estado: "delivered" })).toBe("Entregado");
    expect(resultadoDelAviso({ estado_evento: "fallido", mensaje_error: "sin_plantilla" })).toBe(
      "No salió: falta una plantilla aprobada",
    );
    expect(resultadoDelAviso({ estado_evento: "pendiente" })).toBe("Pendiente de envío");
  });

  it("el cambio programado dice a qué plan pasa y que no hay reembolso", () => {
    expect(
      cambioProgramadoTexto({ plan: { nombre: "Plan Basic", precio: 50000 }, desde: "2026-11-15T00:00:00Z" }, "COP"),
    ).toMatch(/Pasará a «Plan Basic» \(\$\s?50\.000\) desde el .*sin reembolso/);
    expect(cambioProgramadoTexto(null, "COP")).toBeNull();
    expect(canalDePagoExterno({ canal: "transferencia" })).toBe("transferencia");
    expect(canalDePagoExterno(null)).toBeNull();
  });
});

describe("acciones: la confirmación explica la consecuencia", () => {
  const sub = { plan: "Plan Pro", cliente: { id: "c", nombre: "Ana", telefono: null, canal: "whatsapp" } };

  it("pausar no es destructivo y dice que los cobros pendientes siguen abiertos", () => {
    const c = confirmacionDeAccion("pausar", sub);
    expect(c.destructive).toBe(false);
    expect(c.title).toBe("¿Pausar «Plan Pro» de Ana?");
    expect(c.description).toMatch(/cobros nuevos/);
    expect(c.description).toMatch(/siguen abiertos/);
  });

  it("cancelar es destructivo y avisa que no se puede reanudar", () => {
    const c = confirmacionDeAccion("cancelar", sub);
    expect(c.destructive).toBe(true);
    expect(c.description).toMatch(/no se puede reanudar/);
  });

  it("reanudar dice que el próximo cobro se calcula desde hoy", () => {
    expect(confirmacionDeAccion("reanudar", sub).description).toMatch(/desde hoy/);
  });

  it("reenviar el link dice por dónde sale y qué pasa sin WhatsApp", () => {
    const c = confirmacionDeReenvio({ periodo: "2026-10", monto: 200000 }, "Ana");
    expect(c.description).toMatch(/WhatsApp/);
    expect(c.description).toMatch(/cobro de octubre de 2026/);
    expect(mensajeDeReenvio({ enviado: true })).toMatch(/salió por WhatsApp/);
    expect(mensajeDeReenvio({ enviado: false, motivo: "sin_conversacion_whatsapp" })).toMatch(/copia el link/);
  });
});

describe("permisos y planes", () => {
  it("solo escribe quien tiene editar en la sección, o la plataforma", () => {
    expect(puedeAdministrar({ role: "colaborador", permissions: { "pack_subscriptions:suscripciones": "write" } })).toBe(true);
    expect(puedeAdministrar({ role: "colaborador", permissions: { "pack_subscriptions:suscripciones": "read" } })).toBe(false);
    expect(puedeAdministrar({ role: "master", permissions: {} })).toBe(true);
    expect(puedeAdministrar({ role: "tester", permissions: {} })).toBe(true);
    expect(puedeAdministrar(null)).toBe(false);
  });

  it("las opciones del filtro «Plan» salen del catálogo, con los apagados rotulados", () => {
    const opciones = opcionesDePlanes([
      { id: "p-pro", nombre: "Plan Pro", activo: true },
      { id: "p-viejo", nombre: "Plan Viejo", activo: false },
      { id: "p-basic", nombre: "Plan Basic", activo: true },
    ]);
    expect(opciones).toEqual([
      { value: "p-basic", label: "Plan Basic" },
      { value: "p-pro", label: "Plan Pro" },
      { value: "p-viejo", label: "Plan Viejo (inactivo)" },
    ]);
    expect(opcionesDePlanes([])).toEqual([]);
  });

  it("el registro del pago se explica en palabras del negocio", () => {
    expect(mensajeDePagoRegistrado({ estado: "ya_registrado", suscripcion_estado: "activa" })).toMatch(/ya estaba registrado/);
    expect(mensajeDePagoRegistrado({ estado: "registrado", suscripcion_estado: "activa" })).toMatch(/está activa/);
    expect(mensajeDePagoRegistrado({ estado: "registrado", suscripcion_estado: "pausada" })).toBe("Pago registrado.");
    expect(descripcionDeRegistroDePago({ periodo: "2026-10", monto: 200000, moneda: "COP" }, "Ana")).toMatch(/cobro de octubre de 2026 de Ana/);
  });
});

describe("inscripción pendiente de pago (SPEC-43, HU-SUB-31)", () => {
  it("pendiente_pago es un estado y la inscripción un tipo de pago que se pueden filtrar", () => {
    expect(ESTADOS_SUSCRIPCION).toContain("pendiente_pago");
    expect(consultaSuscripciones({ estado: "pendiente_pago" }).get("estado")).toBe("pendiente_pago");
    expect(consultaPagos({ tipo: "inscripcion" }).get("tipo")).toBe("inscripcion");
    expect(tipoDePagoLabel("inscripcion")).toBe("Inscripción");
  });

  it("la confirmación dice qué se confirma, cuánto y que el sistema no comprueba el dinero", () => {
    const texto = descripcionDeConfirmacionDePago({ monto: 99000, moneda: "COP", tipo: "inscripcion" }, "Plan Premium", "Caro");
    expect(texto).toMatch(/Caro pagó la inscripción al plan «Plan Premium» por .*99\.000/);
    expect(texto).toMatch(/el sistema no lo comprueba/);
    expect(texto).toMatch(/La suscripción se activa/);
    const cambio = descripcionDeConfirmacionDePago({ monto: 1, tipo: "cambio_plan" }, "Plan Pro", "Caro");
    expect(cambio).toMatch(/el cambio al plan «Plan Pro»/);
    expect(cambio).toMatch(/El cambio de plan se aplica/);
    expect(cambio).not.toMatch(/se activa/);
  });

  it("el resultado de confirmar distingue la primera vez de la repetición", () => {
    expect(mensajeDePagoConfirmado({ estado: "confirmado", suscripcion_estado: "activa" })).toBe("Pago confirmado. La suscripción está activa.");
    expect(mensajeDePagoConfirmado({ estado: "ya_confirmado", suscripcion_estado: "activa" })).toMatch(/ya estaba confirmado/);
    expect(mensajeDePagoConfirmado({ estado: "confirmado", suscripcion_estado: "pausada" })).toBe("Pago confirmado.");
  });

  it("el monto de la lista sale del cargo de inscripción pendiente, no de otros cargos", () => {
    const montos = montosDeInscripcion([
      { suscripcion_id: "s1", monto: 99000, tipo: "inscripcion", estado: "pendiente" },
      { suscripcion_id: "s2", monto: 50000, tipo: "periodo", estado: "pendiente" },
      { suscripcion_id: "s3", monto: 70000, tipo: "inscripcion", estado: "anulado" },
    ]);
    expect([...montos]).toEqual([["s1", 99000]]);
  });

  it("la línea del descuento vigente solo sale si hay descuento", () => {
    expect(textoDeDescuentoVigente({ mrr_descuento: 25000, suscripciones_con_descuento: 3 }, "COP")).toMatch(
      /^Descuento vigente: −.*25\.000\/mes en 3 suscripciones\.$/,
    );
    expect(textoDeDescuentoVigente({ mrr_descuento: 25000, suscripciones_con_descuento: 1 }, "COP")).toMatch(/en 1 suscripción\./);
    expect(textoDeDescuentoVigente({ mrr_descuento: 0, suscripciones_con_descuento: 0 }, "COP")).toBeNull();
    expect(textoDeDescuentoVigente({}, "COP")).toBeNull();
  });
});

describe("en palabras (SUS)", () => {
  const base = { estado: "activa", deuda: 0, en_mora: 0, dias_mora: null, proximo_cargo: "2026-11-23", trial_termina: null, valor_periodo: 99000, moneda: "COP" };

  it("un solo estado por suscripción", async () => {
    const { situacion } = await import("@/lib/suscripciones-admin");
    expect(situacion({ estado: "pausada", motivo_pausa: "mora" })).toBe("pausada_mora");
    expect(situacion({ estado: "pausada", motivo_pausa: "cliente" })).toBe("pausada_negocio");
    expect(situacion({ estado: "activa" })).toBe("activa");
  });

  it("la línea dice lo que debe o qué sigue", async () => {
    const { lineaDeSuscripcion } = await import("@/lib/suscripciones-admin");
    expect(lineaDeSuscripcion(base)).toBe("Próximo cobro el 23 de nov.");
    expect(lineaDeSuscripcion({ ...base, deuda: 198000, en_mora: 198000, dias_mora: 38 })).toMatch(/^Debe .*198\.000 · 38 días de mora$/);
    expect(lineaDeSuscripcion({ ...base, estado: "pendiente_pago" }, 30000)).toMatch(/^Espera .*30\.000 para empezar$/);
    expect(lineaDeSuscripcion({ ...base, estado: "trialing", trial_termina: "2026-11-15" })).toBe("La prueba termina el 15 de nov.");
    expect(lineaDeSuscripcion({ ...base, estado: "cancelada", proximo_cargo: null })).toBe("Ya no se cobra");
  });

  it("cómo se pagó, la mora por tramos y cuánto se quedan", async () => {
    const { comoPago, tramosEnUnaLinea, retencionPorPlan } = await import("@/lib/suscripciones-admin");
    expect(comoPago({ canal: "wompi" })).toBe("Pagó con Wompi");
    expect(comoPago({ canal: "efectivo" })).toBe("Pagó en efectivo");
    expect(comoPago({ canal: "nequi" })).toBe("Pagó por nequi");
    expect(comoPago(null)).toBeNull();
    expect(tramosEnUnaLinea([{ etiqueta: "1 a 30 días", cargos: 2 }, { etiqueta: "31 a 60 días", cargos: 0 }, { etiqueta: "Más de 60 días", cargos: 1 }])).toBe(
      "2 cobros de 1 a 30 días · 1 cobro de más de 60 días",
    );
    expect(
      retencionPorPlan([
        { plan: "Pro", altas: 2, vigentes: 1 },
        { plan: "Básico", altas: 4, vigentes: 4 },
        { plan: "Pro", altas: 1, vigentes: 1 },
      ]),
    ).toEqual(["Básico: 4 de 4 siguen", "Pro: 2 de 3 siguen"]);
  });

  it("el código de un plan sale de su nombre", async () => {
    const { codigoDesdeNombre } = await import("@/lib/suscripciones-admin");
    expect(codigoDesdeNombre("Pro anual")).toBe("pro_anual");
    expect(codigoDesdeNombre("  Básico (Niños) ")).toBe("basico_ninos");
  });

  it("la frase de la ficha no duplica el punto de las abreviaturas", async () => {
    const { fraseDeLaSuscripcion } = await import("@/lib/suscripciones-admin");
    const s = { ...base, motivo_pausa: null, cargos_pendientes: 0, fecha_cancelacion: null };
    expect(fraseDeLaSuscripcion(s)).toBe("Al día. El próximo cobro es el 23 de nov.");
    expect(
      fraseDeLaSuscripcion({ ...s, estado: "pausada", motivo_pausa: "mora", deuda: 198000, cargos_pendientes: 2, en_mora: 198000, dias_mora: 38 }, "2026-11-03T10:00:00Z"),
    ).toMatch(/^Se pausó el 3 de nov\. porque no pagó\. Debe .*198\.000 de 2 cobros; el más viejo venció hace 38 días\.$/);
  });

  it("Pagos empieza por lo que hay que cobrar", async () => {
    const { vistaDePagos } = await import("@/lib/suscripciones-admin");
    expect(vistaDePagos({})).toBe("por_cobrar");
    expect(consultaPagos({}).get("estado")).toBe("pendiente");
    expect(vistaDePagos({ vencidos: "1" })).toBe("vencidos");
    expect(vistaDePagos({ estado: "pagado" })).toBe("pagados");
    expect(vistaDePagos({ ver: "todos" })).toBe("todos");
    expect(consultaPagos({ ver: "todos" }).has("estado")).toBe(false);
    expect(vistaDePagos({ suscripcion_id: "x" })).toBe("todos");
  });
});
