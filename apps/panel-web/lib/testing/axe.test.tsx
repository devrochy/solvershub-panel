// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";

import { violacionesGraves } from "./axe";

afterEach(cleanup);

// El gate de accesibilidad solo vale si de verdad detecta problemas.
describe("violacionesGraves", () => {
  it("detecta un botón sin nombre accesible", async () => {
    const { container } = render(
      <button type="button">
        <svg aria-hidden="true" />
      </button>,
    );
    expect((await violacionesGraves(container)).join("\n")).toMatch(/button-name/);
  });

  it("detecta una imagen sin texto alternativo", async () => {
    // La imagen sin alt es el caso que se quiere detectar.
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    const { container } = render(<img src="/logo.png" />);
    expect((await violacionesGraves(container)).join("\n")).toMatch(/image-alt/);
  });

  it("no reporta nada en un formulario bien etiquetado", async () => {
    const { container } = render(
      <form>
        <label htmlFor="correo">Correo</label>
        <input id="correo" type="email" />
        <button type="submit">Guardar</button>
      </form>,
    );
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
