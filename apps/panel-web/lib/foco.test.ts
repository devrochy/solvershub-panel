// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { focoParaDevolver } from "./foco";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("focoParaDevolver", () => {
  it("devuelve el elemento con el foco", () => {
    document.body.innerHTML = `<button id="b">Guardar</button>`;
    const boton = document.getElementById("b")!;
    boton.focus();
    expect(focoParaDevolver()).toBe(boton);
  });

  it("desde un ítem de menú devuelve el botón que abrió el menú", () => {
    document.body.innerHTML = `
      <button id="disparador">Más acciones</button>
      <div role="menu" aria-labelledby="disparador"><div role="menuitem" tabindex="-1" id="item">Editar</div></div>`;
    document.getElementById("item")!.focus();
    expect(focoParaDevolver()).toBe(document.getElementById("disparador"));
  });

  it("sin nadie con el foco no devuelve nada", () => {
    expect(focoParaDevolver()).toBeNull();
  });
});
