import { describe, expect, it } from "vitest";

import {
  codigoValido,
  errorDeContrasenaNueva,
  mensajeDelReset,
  normalizarCodigo,
  resultadoDelCanje,
  tokenDelFragmento,
} from "./acceso";

const TOKEN = "3f2b0c1a-1111-4222-8333-444455556666.AbCdEfGhIjKlMnOpQrStUvWxYz012345_-xyz";

describe("enlace de la invitación (HU-SH-06)", () => {
  it("lee el token del fragmento", () => {
    expect(tokenDelFragmento(`#${TOKEN}`)).toBe(TOKEN);
    expect(tokenDelFragmento(TOKEN)).toBe(TOKEN);
    expect(tokenDelFragmento(`#${encodeURIComponent(TOKEN)}`)).toBe(TOKEN);
  });

  it("rechaza fragmentos vacíos, rotos o con otra forma", () => {
    expect(tokenDelFragmento("")).toBeNull();
    expect(tokenDelFragmento(null)).toBeNull();
    expect(tokenDelFragmento("#")).toBeNull();
    expect(tokenDelFragmento("#hola")).toBeNull();
    expect(tokenDelFragmento("#%E0%A4%A")).toBeNull(); // codificación inválida
    expect(tokenDelFragmento(`#${TOKEN}<script>`)).toBeNull();
    expect(tokenDelFragmento(`#${TOKEN}${"a".repeat(300)}`)).toBeNull();
  });

  it("valida la contraseña nueva antes de llamar a la API", () => {
    expect(errorDeContrasenaNueva("corta", "corta")).toContain("8 caracteres");
    expect(errorDeContrasenaNueva("clave-larga-1", "clave-larga-2")).toBe("Las dos contraseñas no coinciden.");
    expect(errorDeContrasenaNueva("clave-larga-1", "clave-larga-1")).toBeNull();
  });

  it("traduce la respuesta del canje", () => {
    expect(resultadoDelCanje(400)).toBe("enlace_invalido");
    expect(resultadoDelCanje(409)).toBe("cuenta_existente");
    expect(resultadoDelCanje(429)).toBe("bloqueado");
    expect(resultadoDelCanje(500)).toBe("error");
  });
});

describe("recuperar la contraseña (ADR-0098)", () => {
  it("acepta el código de 8 caracteres como lo escriba la persona", () => {
    expect(normalizarCodigo(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(codigoValido("abcd efgh")).toBe(true);
    expect(codigoValido("ABCD0FGH")).toBe(false); // el 0 no está en el alfabeto
    expect(codigoValido("ABC")).toBe(false);
  });

  it("explica por qué falló el cambio", () => {
    expect(mensajeDelReset(400)).toContain("venció");
    expect(mensajeDelReset(429)).toContain("Demasiados intentos");
  });
});
