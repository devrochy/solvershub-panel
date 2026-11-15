import { describe, expect, it } from "vitest";

import {
  erroresDeCredenciales,
  estadoTwilio,
  etiquetaDeSender,
  mensajeErrorTwilio,
  motivoDeSender,
  puedeEscribirTwilio,
  rutaTwilioDeBackend,
  totalDeMoneda,
  webhookPrevio,
} from "@/lib/conexion-twilio";

const ID = "3f1c2a7e-5b8d-4c1e-9a2b-0d4e6f8a1b2c";
const SID = `AC${"a".repeat(32)}`;

describe("WhatsApp vía Twilio: permisos y credenciales", () => {
  it("escriben el propietario o el master, y solo con Conexiones en escritura (como require_owner_or_master)", () => {
    expect(puedeEscribirTwilio({ role: "master", tenant: null, permissions: { connections: "write" } } as never)).toBe(true);
    expect(puedeEscribirTwilio({ role: "admin", tenant: { role: "owner" }, permissions: { connections: "write" } } as never)).toBe(true);
    expect(puedeEscribirTwilio({ role: "admin", tenant: { role: "manager" }, permissions: { connections: "write" } } as never)).toBe(false);
    expect(puedeEscribirTwilio({ role: "admin", tenant: { role: "owner" }, permissions: { connections: "read" } } as never)).toBe(false);
  });

  it("el Account SID empieza por AC y tiene 34 caracteres; el token no puede ir vacío", () => {
    expect(erroresDeCredenciales(SID, "tok")).toEqual({});
    expect(erroresDeCredenciales(`  ${SID} `, "tok")).toEqual({});
    expect(erroresDeCredenciales("", "")).toEqual({
      account_sid: expect.stringContaining("Pega"),
      auth_token: expect.stringContaining("Auth Token"),
    });
    expect(erroresDeCredenciales(`XE${"a".repeat(32)}`, "tok").account_sid).toContain("AC");
    expect(erroresDeCredenciales("AC123", "tok").account_sid).toContain("34");
  });

  it("los códigos estables de la API tienen su mensaje; uno desconocido usa el texto de la API", () => {
    expect(mensajeErrorTwilio("twilio_credentials_invalid", "x")).toContain("Auth Token");
    expect(mensajeErrorTwilio("fuera_de_ventana", "x")).toContain("24 h");
    expect(mensajeErrorTwilio("daily_limit", "x")).toContain("10");
    expect(mensajeErrorTwilio("otro", "texto de la API")).toBe("texto de la API");
    expect(mensajeErrorTwilio(undefined, "texto")).toBe("texto");
  });
});

describe("WhatsApp vía Twilio: alta guiada", () => {
  it("cada número dice por qué no se puede elegir", () => {
    expect(motivoDeSender({ motivo: "no_online", status: "OFFLINE" })).toContain("OFFLINE");
    expect(motivoDeSender({ motivo: "ya_conectado_aqui", status: "ONLINE" })).toContain("este negocio");
    expect(motivoDeSender({ motivo: "", status: "ONLINE" })).toBe("");
    expect(etiquetaDeSender({ e164: "+573005550101", display_name: "Ventas" })).toBe("+573005550101 · Ventas");
    expect(etiquetaDeSender({ e164: "+573005550101", display_name: " " })).toBe("+573005550101");
  });

  it("la dirección previa sale de details.previous_webhook (objeto por campo o texto)", () => {
    expect(webhookPrevio({ previous_webhook: { callback_url: "https://otro.example/wa" } })).toBe("https://otro.example/wa");
    expect(webhookPrevio({ previous_webhook: "https://otro.example/wa" })).toBe("https://otro.example/wa");
    expect(webhookPrevio({ previous_webhook: {} })).toBeNull();
    expect(webhookPrevio(undefined)).toBeNull();
  });
});

describe("WhatsApp vía Twilio: ficha", () => {
  it("estado en palabras con su tono", () => {
    expect(estadoTwilio("connected")).toMatchObject({ label: "Funciona", tono: "success" });
    expect(estadoTwilio("degraded")).toMatchObject({ label: "Con avisos", tono: "warning" });
    expect(estadoTwilio("revoked")).toMatchObject({ label: "No funciona", tono: "danger" });
    expect(estadoTwilio("error").tono).toBe("danger");
    expect(estadoTwilio("pending").tono).toBe("info");
    expect(estadoTwilio("raro")).toMatchObject({ label: "raro", tono: "neutral" });
  });

  it("el costo se muestra en positivo (Twilio informa el débito en negativo) y en su moneda", () => {
    expect(totalDeMoneda({ moneda: "USD", total: "-0.0500" })).toBe(totalDeMoneda({ moneda: "USD", total: "0.05" }));
    expect(totalDeMoneda({ moneda: "USD", total: "-0.0500" })).toContain("0,05");
    expect(totalDeMoneda({ moneda: "", total: "1" })).toContain("1");
    expect(totalDeMoneda({ moneda: "USD", total: "nada" })).toBe("nada USD");
  });
});

describe("WhatsApp vía Twilio: rutas del BFF (lista cerrada)", () => {
  it("alta y descubrimiento", () => {
    expect(rutaTwilioDeBackend("POST", [])).toBe("/admin/connections/twilio");
    expect(rutaTwilioDeBackend("POST", ["discover"])).toBe("/admin/connections/twilio/discover");
    expect(rutaTwilioDeBackend("GET", [])).toBeNull();
    expect(rutaTwilioDeBackend("GET", ["discover"])).toBeNull();
  });

  it("acciones de una conexión, solo con id UUID", () => {
    expect(rutaTwilioDeBackend("GET", [ID])).toBe(`/admin/connections/twilio/${ID}`);
    for (const accion of ["refresh", "webhooks", "test-message"]) {
      expect(rutaTwilioDeBackend("POST", [ID, accion])).toBe(`/admin/connections/twilio/${ID}/${accion}`);
    }
    expect(rutaTwilioDeBackend("PUT", [ID, "credentials"])).toBe(`/admin/connections/twilio/${ID}/credentials`);
    expect(rutaTwilioDeBackend("POST", ["no-es-uuid", "refresh"])).toBeNull();
    expect(rutaTwilioDeBackend("POST", [ID, "disconnect"])).toBeNull();
    expect(rutaTwilioDeBackend("POST", [ID, "templates"])).toBeNull();
    expect(rutaTwilioDeBackend("GET", [ID, "credentials"])).toBeNull();
    expect(rutaTwilioDeBackend("POST", [ID, "refresh", "x"])).toBeNull();
  });

  it("costos con los días acotados a 1–90", () => {
    expect(rutaTwilioDeBackend("GET", [ID, "costs"])).toBe(`/admin/connections/twilio/${ID}/costs?dias=30`);
    expect(rutaTwilioDeBackend("GET", [ID, "costs"], "7")).toBe(`/admin/connections/twilio/${ID}/costs?dias=7`);
    expect(rutaTwilioDeBackend("GET", [ID, "costs"], "500")).toBe(`/admin/connections/twilio/${ID}/costs?dias=90`);
    expect(rutaTwilioDeBackend("GET", [ID, "costs"], "abc")).toBe(`/admin/connections/twilio/${ID}/costs?dias=30`);
  });
});
