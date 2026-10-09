import { afterEach, describe, expect, it, vi } from "vitest";

import {
  CanjePendiente,
  esOrigenDeFacebook,
  estadoPasos,
  nombrePaso,
  parseSignupEvent,
  type FinishEvent,
} from "./embedded-signup";

describe("esOrigenDeFacebook", () => {
  it("acepta facebook.com y sus subdominios por https", () => {
    expect(esOrigenDeFacebook("https://www.facebook.com")).toBe(true);
    expect(esOrigenDeFacebook("https://web.facebook.com")).toBe(true);
    expect(esOrigenDeFacebook("https://facebook.com")).toBe(true);
  });

  it("rechaza hosts que solo terminan en el texto, http y basura", () => {
    expect(esOrigenDeFacebook("https://evilfacebook.com")).toBe(false);
    expect(esOrigenDeFacebook("https://facebook.com.evil.test")).toBe(false);
    expect(esOrigenDeFacebook("http://www.facebook.com")).toBe(false);
    expect(esOrigenDeFacebook("null")).toBe(false);
    expect(esOrigenDeFacebook("")).toBe(false);
  });
});

describe("parseSignupEvent", () => {
  it("lee FINISH de v4 (string JSON) con WABA, número y portafolio", () => {
    const raw = JSON.stringify({
      type: "WA_EMBEDDED_SIGNUP",
      event: "FINISH",
      data: { phone_number_id: "106540352242922", waba_id: "524126980791429", business_id: "2729063490586005" },
    });
    expect(parseSignupEvent(raw)).toEqual({
      kind: "finish",
      eventType: "FINISH",
      wabaId: "524126980791429",
      phoneNumberId: "106540352242922",
      businessId: "2729063490586005",
    });
  });

  it("acepta coexistencia y solo WABA", () => {
    const coex = parseSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", data: { waba_id: "1" } });
    expect(coex).toMatchObject({ kind: "finish", eventType: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING", wabaId: "1", phoneNumberId: "" });
    expect(parseSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH_ONLY_WABA", data: {} })).toMatchObject({ kind: "finish" });
  });

  it("descarta IDs que podrían cambiar la ruta de Graph", () => {
    const ev = parseSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH", data: { waba_id: "1/../me?x", phone_number_id: "2" } });
    expect(ev).toMatchObject({ wabaId: "", phoneNumberId: "2" });
  });

  it("lee CANCEL por abandono y por error reportado (y ERROR viejo)", () => {
    expect(parseSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "CANCEL", data: { current_step: "PHONE_NUMBER_SETUP" } })).toEqual({
      kind: "cancel",
      currentStep: "PHONE_NUMBER_SETUP",
      errorMessage: undefined,
      errorCode: undefined,
      sessionId: undefined,
    });
    expect(
      parseSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "CANCEL", data: { error_message: "Algo falló", error_code: 524126, session_id: "s" } }),
    ).toMatchObject({ kind: "cancel", errorMessage: "Algo falló", errorCode: "524126", sessionId: "s" });
    expect(parseSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "ERROR", data: { error_message: "x" } })).toMatchObject({ kind: "cancel" });
  });

  it("ignora otros mensajes", () => {
    expect(parseSignupEvent("no es json")).toBeNull();
    expect(parseSignupEvent({ type: "OTRA_COSA", event: "FINISH" })).toBeNull();
    expect(parseSignupEvent({ type: "WA_EMBEDDED_SIGNUP", event: "FINISH_OBO_MIGRATION" })).toBeNull();
    expect(parseSignupEvent(null)).toBeNull();
  });
});

describe("pasos", () => {
  it("nombra cada paso y marca el avance", () => {
    expect(nombrePaso("register_number")).toBe("Registrar el número con su PIN");
    expect(estadoPasos("register_number").map((p) => p.estado)).toEqual(["hecho", "hecho", "actual", "pendiente", "pendiente"]);
    expect(estadoPasos("done").every((p) => p.estado === "hecho")).toBe(true);
    expect(estadoPasos("select_channel")[0].estado).toBe("actual");
  });
});

describe("CanjePendiente", () => {
  afterEach(() => vi.useRealTimers());
  const finish: FinishEvent = { kind: "finish", eventType: "FINISH", wabaId: "1", phoneNumberId: "2", businessId: "3" };

  it("con el evento antes del code canjea en cuanto llega el code", () => {
    const onListo = vi.fn();
    const canje = new CanjePendiente(onListo);
    canje.conFinish(finish);
    canje.conCode("abc");
    expect(onListo).toHaveBeenCalledWith("abc", finish);
  });

  it("con el code antes espera el evento", () => {
    vi.useFakeTimers();
    const onListo = vi.fn();
    const canje = new CanjePendiente(onListo, 3000);
    canje.conCode("abc");
    expect(onListo).not.toHaveBeenCalled();
    canje.conFinish(finish);
    expect(onListo).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(onListo).toHaveBeenCalledTimes(1);
  });

  it("sin evento canjea igual al vencer la espera, una sola vez", () => {
    vi.useFakeTimers();
    const onListo = vi.fn();
    const canje = new CanjePendiente(onListo, 3000);
    canje.conCode("abc");
    vi.advanceTimersByTime(3000);
    expect(onListo).toHaveBeenCalledWith("abc", null);
    canje.conFinish(finish);
    expect(onListo).toHaveBeenCalledTimes(1);
  });

  it("cancelado no canjea", () => {
    vi.useFakeTimers();
    const onListo = vi.fn();
    const canje = new CanjePendiente(onListo, 3000);
    canje.conCode("abc");
    canje.cancelar();
    vi.advanceTimersByTime(5000);
    expect(onListo).not.toHaveBeenCalled();
  });
});
