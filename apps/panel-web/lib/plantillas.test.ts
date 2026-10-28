import { describe, expect, it } from "vitest";

import {
  CANALES_DE_TEXTO,
  admiteTextoPorCanal,
  claveDePlantilla,
  eventoLabel,
  faltantes,
  mapeoParaApi,
  rellenarCuerpo,
  rutasDesdeApi,
  textosPorCanalParaApi,
  variablesDelTexto,
  variablesNoPermitidas,
} from "./plantillas";

describe("plantillas por evento (HU-ARCH-13)", () => {
  it("rellena el cuerpo y marca lo que falta", () => {
    expect(rellenarCuerpo("Hola {{1}}, debes {{ 2 }}.", { "1": "Ana" })).toBe("Hola Ana, debes [2].");
    expect(rellenarCuerpo("Hola {{nombre}}", { nombre: " Ana " })).toBe("Hola Ana");
  });

  it("arma el mapeo en la forma que espera la API", () => {
    const rutas = { "1": "cliente.nombre", "2": "cargo.monto" };
    expect(mapeoParaApi(["1", "2"], false, rutas)).toEqual(["cliente.nombre", "cargo.monto"]);
    expect(mapeoParaApi(["nombre"], true, { nombre: "cliente.nombre" })).toEqual({
      nombre: "cliente.nombre",
    });
  });

  it("lee un mapeo guardado (lista o con nombre)", () => {
    expect(rutasDesdeApi(["1", "2"], ["a", "b"])).toEqual({ "1": "a", "2": "b" });
    expect(rutasDesdeApi(["x"], { x: "a" })).toEqual({ x: "a" });
    expect(rutasDesdeApi(["1"], undefined)).toEqual({});
  });

  it("detecta variables sin completar", () => {
    expect(faltantes(["1", "2"], { "1": "Ana", "2": "  " })).toEqual(["2"]);
  });

  it("etiqueta eventos y claves de plantilla", () => {
    expect(eventoLabel("subscription.charge_created")).toBe("Cargo de suscripción generado");
    expect(eventoLabel("subscription.charge_reminder")).toBe("Recordatorio de pago de suscripción");
    expect(eventoLabel("subscription.paused")).toBe("Suscripción pausada por mora");
    expect(eventoLabel("subscription.trial_ending")).toBe("Fin de la prueba gratis");
    expect(eventoLabel("appointment.reminder")).toBe("Recordatorio de cita");
    expect(eventoLabel("otro.evento")).toBe("otro.evento");
    expect(claveDePlantilla("aviso", "es")).toBe("aviso|es");
  });
});

describe("texto por canal de los avisos por evento (ADR-0178 D2)", () => {
  it("el QR no admite texto en los 3 eventos de cobranza, los demás canales sí", () => {
    for (const ev of ["subscription.charge_created", "subscription.charge_reminder", "subscription.paused"]) {
      expect(admiteTextoPorCanal(ev, "whatsapp_waweb")).toBe(false);
      expect(admiteTextoPorCanal(ev, "webchat")).toBe(true);
      expect(admiteTextoPorCanal(ev, "messenger_meta")).toBe(true);
      expect(admiteTextoPorCanal(ev, "instagram_meta")).toBe(true);
    }
    expect(admiteTextoPorCanal("appointment.reminder", "whatsapp_waweb")).toBe(true);
    expect(admiteTextoPorCanal("subscription.trial_ending", "whatsapp_waweb")).toBe(true);
  });

  it("las claves de los canales son los tipos de conexión de la API", () => {
    expect(CANALES_DE_TEXTO.map((c) => c.tipo)).toEqual(["whatsapp_waweb", "webchat", "messenger_meta", "instagram_meta"]);
  });

  it("lee las variables en los tres dialectos, sin repetir ni contar llaves vacías", () => {
    expect(variablesDelTexto("Hola {cliente.nombre}, {{fecha}} y {cliente.nombre}. {} {{ n_1 }}")).toEqual([
      "cliente.nombre",
      "fecha",
      "n_1",
    ]);
    expect(variablesNoPermitidas("Hola {cliente.nombre} {cargo.secreto}", ["cliente.nombre"])).toEqual(["cargo.secreto"]);
    expect(variablesNoPermitidas("Sin variables", ["cliente.nombre"])).toEqual([]);
  });

  it("arma los textos para la API: sin vacíos, recortados y sin QR en cobranza", () => {
    const textos = { whatsapp_waweb: " Tu cita ", webchat: "   ", messenger_meta: "Hola", otro: "no va" };
    expect(textosPorCanalParaApi("appointment.reminder", textos)).toEqual({
      whatsapp_waweb: "Tu cita",
      messenger_meta: "Hola",
    });
    expect(textosPorCanalParaApi("subscription.paused", textos)).toEqual({ messenger_meta: "Hola" });
    expect(textosPorCanalParaApi("subscription.paused", {})).toEqual({});
  });
});
