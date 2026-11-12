// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const abrirPaleta = vi.fn();
vi.mock("@/components/shell/atajos-context", () => ({
  useAtajos: () => ({ abrirPaleta }),
}));

import { BotonBuscar } from "./boton-buscar";

afterEach(() => {
  cleanup();
  abrirPaleta.mockReset();
});

describe("BotonBuscar", () => {
  it("muestra el texto en una sola línea y abre la paleta", () => {
    render(<BotonBuscar />);
    const boton = screen.getByRole("button", { name: "Buscar en el panel o ir a una sección" });
    const texto = screen.getByText("Buscar o ir a…");
    // El ancho fijo anterior partía la frase; ahora se recorta en una línea.
    expect(texto.className).toMatch(/whitespace-nowrap/);
    expect(texto.className).toMatch(/truncate/);
    expect(boton.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(boton);
    expect(abrirPaleta).toHaveBeenCalledTimes(1);
  });
});
