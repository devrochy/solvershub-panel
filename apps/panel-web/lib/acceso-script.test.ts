// @vitest-environment jsdom
import { describe, expect, it } from "vitest";

import { SCRIPT_QUE_GUARDA_EL_TOKEN, VARIABLE_DEL_TOKEN, tokenDelFragmento } from "./acceso";

const TOKEN = "3f2b0c1a-1111-4222-8333-444455556666.AbCdEfGhIjKlMnOpQrStUvWxYz012345_-xyz";

describe("script de /invitacion (HU-SH-06)", () => {
  it("guarda el token y lo borra de la URL antes de hidratar", () => {
    window.history.replaceState(null, "", `/invitacion?x=1#${TOKEN}`);
    new Function(SCRIPT_QUE_GUARDA_EL_TOKEN)();
    expect(window.location.hash).toBe("");
    expect(window.location.pathname + window.location.search).toBe("/invitacion?x=1");
    const guardado = (window as unknown as Record<string, unknown>)[VARIABLE_DEL_TOKEN];
    expect(tokenDelFragmento(String(guardado))).toBe(TOKEN);
  });

  it("sin fragmento no toca nada", () => {
    delete (window as unknown as Record<string, unknown>)[VARIABLE_DEL_TOKEN];
    window.history.replaceState(null, "", "/invitacion");
    new Function(SCRIPT_QUE_GUARDA_EL_TOKEN)();
    expect((window as unknown as Record<string, unknown>)[VARIABLE_DEL_TOKEN]).toBeUndefined();
  });
});
