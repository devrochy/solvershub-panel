import { describe, expect, it } from "vitest";

import { hrefDeDestino } from "./destinos";

describe("hrefDeDestino (ADR-0171)", () => {
  it("traduce las rutas lógicas del backend a pantallas del panel", () => {
    expect(hrefDeDestino({ ruta: "conversaciones", params: {} })).toBe("/conversaciones");
    expect(hrefDeDestino({ ruta: "escalaciones", params: { estado: "pendiente" } })).toBe("/escalaciones");
    expect(hrefDeDestino({ ruta: "comercio.pedidos", params: { estado: "abierto" } })).toBe("/comercio/pedidos");
    expect(hrefDeDestino({ ruta: "calendario.citas", params: { periodo: "hoy" } })).toBe("/calendario");
    expect(hrefDeDestino({ ruta: "cobranza.carteras", params: { mora: "1" } })).toBe("/cobranza/carteras");
    expect(hrefDeDestino({ ruta: "suscripciones", params: {} })).toBe("/suscripciones");
    expect(hrefDeDestino({ ruta: "leads", params: {} })).toBe("/leads");
  });

  it("al agente va por su ref y la pestaña, y la de conversaciones es la de por defecto", () => {
    expect(hrefDeDestino({ ruta: "agente", params: { ref: "general", pestana: "consumo" } })).toBe(
      "/agentes/general?tab=consumo",
    );
    expect(hrefDeDestino({ ruta: "agente", params: { ref: "abc-123", pestana: "tareas" } })).toBe(
      "/agentes/abc-123?tab=tareas",
    );
    expect(hrefDeDestino({ ruta: "agente", params: { ref: "abc-123", pestana: "conversaciones" } })).toBe(
      "/agentes/abc-123",
    );
    expect(hrefDeDestino({ ruta: "agente", params: { ref: "abc-123", pestana: "inventada" } })).toBe("/agentes/abc-123");
    expect(hrefDeDestino({ ruta: "agente", params: {} })).toBeUndefined();
  });

  it("solo pasa los filtros que la pantalla destino lee de la URL", () => {
    expect(hrefDeDestino({ ruta: "suscripciones.pagos", params: { vencidos: "1", otro: "x" } })).toBe(
      "/suscripciones/pagos?vencidos=1",
    );
    expect(hrefDeDestino({ ruta: "suscripciones.lista", params: { estado: "activa" } })).toBe(
      "/suscripciones/lista?estado=activa",
    );
    expect(hrefDeDestino({ ruta: "suscripciones.lista", params: {} })).toBe("/suscripciones/lista");
  });

  it("un destino desconocido o ausente deja la tarjeta sin enlace", () => {
    expect(hrefDeDestino({ ruta: "no.existe", params: {} })).toBeUndefined();
    expect(hrefDeDestino(null)).toBeUndefined();
    expect(hrefDeDestino(undefined)).toBeUndefined();
  });
});
