// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import { CERRAR_MENUS, escapeConMenuAbierto } from "./escape-con-menu";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Escape con un menú abierto", () => {
  it("el cajón no se cierra y les pide a los menús que se cierren", () => {
    document.body.innerHTML = '<div role="menu" data-state="open"></div>';
    const cerrar = vi.fn();
    window.addEventListener(CERRAR_MENUS, cerrar);
    const evento = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    escapeConMenuAbierto(evento);
    window.removeEventListener(CERRAR_MENUS, cerrar);
    expect(evento.defaultPrevented).toBe(true);
    expect(cerrar).toHaveBeenCalledOnce();
  });

  it("sin menú, el cajón se cierra como siempre", () => {
    const evento = new KeyboardEvent("keydown", { key: "Escape", cancelable: true });
    escapeConMenuAbierto(evento);
    expect(evento.defaultPrevented).toBe(false);
  });
});
