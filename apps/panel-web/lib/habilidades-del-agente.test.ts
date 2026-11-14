import { describe, expect, it } from "vitest";

import type { AgentSkill, PaymentAccount } from "@/lib/api/types";
import {
  CONOCIMIENTO,
  PAGOS,
  abiertaAlCargar,
  cuentaElegida,
  estadoDeHabilidad,
  etiquetaDeCuenta,
  pasosDeHabilidad,
  resumenDeHabilidad,
  textoDeHabilidad,
} from "@/lib/habilidades-del-agente";

const cuenta = (id: string, sandbox = true): PaymentAccount => ({
  id,
  name: `Cuenta ${id}`,
  public_key: "pub_test_x",
  sandbox,
  link_expires_hours: 24,
  min_amount: null,
  events_url: `https://x/webhooks/payments/wompi/neg/${id}`,
  agent_ids: [],
});

describe("habilidades del agente", () => {
  it("nombra las habilidades sin palabras internas", () => {
    expect(textoDeHabilidad(PAGOS).nombre).toBe("Pagos en línea");
    expect(textoDeHabilidad("pack_x").nombre).toBe("Habilidad");
  });

  it("estado: sin agregar, lista o falta configurar", () => {
    const base: AgentSkill = { pack_id: PAGOS, installed: false, status: null, config: {} };
    expect(estadoDeHabilidad(base)).toBe("sin_agregar");
    expect(estadoDeHabilidad({ ...base, installed: true, status: "pending_config" })).toBe("falta_configurar");
    expect(estadoDeHabilidad({ ...base, installed: true, status: "active" })).toBe("lista");
  });

  it("encuentra la cuenta elegida solo si sigue existiendo", () => {
    const h: AgentSkill = { pack_id: PAGOS, installed: true, status: "active", config: { cuenta_id: "b" } };
    expect(cuentaElegida(h, [cuenta("a"), cuenta("b")])?.id).toBe("b");
    expect(cuentaElegida(h, [cuenta("a")])).toBeUndefined();
    expect(etiquetaDeCuenta(cuenta("a", false))).toBe("Cuenta a · producción");
  });

  const ctx = { cuentas: [cuenta("a", false)], usaEnBorrador: false, usaPublicado: false, documentos: 0 };

  it("pagos: falta elegir la cuenta hasta que haya una que siga existiendo", () => {
    const sin: AgentSkill = { pack_id: PAGOS, installed: true, status: "pending_config", config: {} };
    const pasos = pasosDeHabilidad(sin, ctx);
    expect(pasos.map((p) => [p.id, p.hecho])).toEqual([["activa", true], ["cuenta", false]]);
    expect(abiertaAlCargar(sin, pasos)).toBe(true);
    expect(resumenDeHabilidad(sin, pasos)).toBe("Falta 1 paso");

    const con: AgentSkill = { ...sin, status: "active", config: { cuenta_id: "a" } };
    const listos = pasosDeHabilidad(con, ctx);
    expect(abiertaAlCargar(con, listos)).toBe(false);
    expect(resumenDeHabilidad(con, listos)).toBe("Cobra con Cuenta a · producción");
  });

  it("conocimiento: búsqueda en el borrador, publicada y documentos", () => {
    const h: AgentSkill = { pack_id: CONOCIMIENTO, installed: true, status: "active", config: {} };
    expect(resumenDeHabilidad(h, pasosDeHabilidad(h, ctx))).toBe("Faltan 2 pasos");

    const enBorrador = pasosDeHabilidad(h, { ...ctx, usaEnBorrador: true, documentos: 1 });
    expect(enBorrador.find((p) => p.id === "responde")).toMatchObject({ hecho: true, sinPublicar: true });
    expect(abiertaAlCargar(h, enBorrador)).toBe(true);

    const listo = pasosDeHabilidad(h, { ...ctx, usaEnBorrador: true, usaPublicado: true, documentos: 3 });
    expect(abiertaAlCargar(h, listo)).toBe(false);
    expect(resumenDeHabilidad(h, listo)).toBe("Responde con los documentos · 3 documentos cargados");
  });

  it("sin agregar: cerrada y sin resumen", () => {
    const h: AgentSkill = { pack_id: CONOCIMIENTO, installed: false, status: null, config: {} };
    const pasos = pasosDeHabilidad(h, ctx);
    expect(abiertaAlCargar(h, pasos)).toBe(false);
    expect(resumenDeHabilidad(h, pasos)).toBe("");
  });
});
