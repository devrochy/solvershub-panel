// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { TemaDeAcceso } from "./tema-de-acceso";

beforeEach(() => {
  document.documentElement.dataset.theme = "sh-dark";
  document.cookie = "panel_theme=sh-dark; path=/";
});

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
  document.cookie = "panel_theme=; path=/; max-age=0";
});

describe("TemaDeAcceso", () => {
  it("aplica el tema al documento y lo guarda en la cookie", () => {
    render(<TemaDeAcceso inicial="sh-dark" />);
    const interruptor = screen.getByRole("switch", { name: "Tema oscuro" });
    expect(interruptor.getAttribute("aria-checked")).toBe("true");

    fireEvent.click(interruptor);

    expect(interruptor.getAttribute("aria-checked")).toBe("false");
    expect(document.documentElement.dataset.theme).toBe("sh-light");
    expect(document.cookie).toContain("panel_theme=sh-light");
  });

  it("respeta el tema claro inicial", () => {
    render(<TemaDeAcceso inicial="sh-light" />);
    expect(screen.getByRole("switch", { name: "Tema oscuro" }).getAttribute("aria-checked")).toBe(
      "false",
    );
  });
});
