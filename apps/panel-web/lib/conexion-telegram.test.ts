import { describe, expect, it } from "vitest";

import {
  avisoDesconectadoTelegram,
  enlaceDeBot,
  errorDeChatId,
  errorDeToken,
  estadoTelegram,
  mensajeErrorTelegram,
  puedeEscribirTelegram,
  rutaTelegramDeBackend,
  usuarioDeBot,
  webhookAjeno,
} from "./conexion-telegram";

const ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

describe("conexion-telegram (HU-CONN-27)", () => {
  it("solo el propietario o el master con Conexiones en escritura operan el bot", () => {
    const base = { permissions: { connections: "write" as const }, tenant: { role: "owner" } };
    expect(puedeEscribirTelegram({ role: "admin", ...base } as never)).toBe(true);
    expect(puedeEscribirTelegram({ role: "master", permissions: { connections: "write" }, tenant: null } as never)).toBe(true);
    expect(puedeEscribirTelegram({ role: "admin", permissions: { connections: "write" }, tenant: { role: "collaborator" } } as never)).toBe(false);
    expect(puedeEscribirTelegram({ role: "master", permissions: { connections: "read" }, tenant: null } as never)).toBe(false);
  });

  it("revisa la forma del token antes de llamar a Telegram", () => {
    expect(errorDeToken("")).toMatch(/BotFather/);
    expect(errorDeToken("hola")).toMatch(/123456789:AAH/);
    expect(errorDeToken("123456789:corto")).toBeDefined();
    expect(errorDeToken(` 123456789:AAH${"x".repeat(32)} `)).toBeUndefined();
  });

  it("traduce los códigos estables y cae al texto de la API", () => {
    expect(mensajeErrorTelegram("bot_en_otro_negocio", "x")).toMatch(/otro negocio/);
    expect(mensajeErrorTelegram("chat_no_iniciado", "x")).toMatch(/\/start/);
    expect(mensajeErrorTelegram("desconocido", "texto de la API")).toBe("texto de la API");
    expect(mensajeErrorTelegram(undefined, "texto")).toBe("texto");
  });

  it("lee la dirección ajena del 409 webhook_ajeno", () => {
    expect(webhookAjeno({ webhook_url: "https://otra.example/hook" })).toBe("https://otra.example/hook");
    expect(webhookAjeno({ webhook_url: "" })).toBeNull();
    expect(webhookAjeno(undefined)).toBeNull();
  });

  it("pone el estado en palabras", () => {
    expect(estadoTelegram("connected")).toMatchObject({ label: "Funciona", tono: "success" });
    expect(estadoTelegram("revoked").detalle).toMatch(/BotFather/);
    expect(estadoTelegram("degraded").tono).toBe("warning");
    expect(estadoTelegram("")).toMatchObject({ label: "Sin revisar", tono: "neutral" });
  });

  it("muestra el @usuario y su enlace solo si es válido", () => {
    expect(usuarioDeBot("mi_bot")).toBe("@mi_bot");
    expect(usuarioDeBot("@mi_bot")).toBe("@mi_bot");
    expect(usuarioDeBot("")).toBe("Bot de Telegram");
    expect(enlaceDeBot("mitienda_bot")).toBe("https://t.me/mitienda_bot");
    expect(enlaceDeBot("x/../y")).toBeNull();
    expect(enlaceDeBot(null)).toBeNull();
  });

  it("valida el id del chat de prueba", () => {
    expect(errorDeChatId("")).toBeDefined();
    expect(errorDeChatId("abc")).toBeDefined();
    expect(errorDeChatId("123456789")).toBeUndefined();
  });

  it("avisa qué pasó con el webhook al desconectar", () => {
    expect(avisoDesconectadoTelegram(true)).toMatch(/quitó el webhook/);
    expect(avisoDesconectadoTelegram(false)).toMatch(/BotFather/);
  });

  it("reenvía solo la lista cerrada de rutas al backend", () => {
    const base = "/admin/connections/telegram";
    expect(rutaTelegramDeBackend("POST", [])).toBe(base);
    expect(rutaTelegramDeBackend("GET", [])).toBe(base);
    expect(rutaTelegramDeBackend("DELETE", [])).toBeNull();
    expect(rutaTelegramDeBackend("GET", [ID])).toBe(`${base}/${ID}`);
    for (const accion of ["refresh", "webhooks", "test-message", "disconnect"]) {
      expect(rutaTelegramDeBackend("POST", [ID, accion])).toBe(`${base}/${ID}/${accion}`);
    }
    expect(rutaTelegramDeBackend("PUT", [ID, "credentials"])).toBe(`${base}/${ID}/credentials`);
    expect(rutaTelegramDeBackend("GET", [ID, "refresh"])).toBeNull();
    expect(rutaTelegramDeBackend("POST", ["no-es-uuid", "refresh"])).toBeNull();
    expect(rutaTelegramDeBackend("POST", [ID, "otra"])).toBeNull();
    expect(rutaTelegramDeBackend("POST", [ID, "refresh", "mas"])).toBeNull();
  });
});
