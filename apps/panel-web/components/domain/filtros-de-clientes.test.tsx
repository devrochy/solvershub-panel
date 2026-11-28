// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FiltrosDeClientes } from "@/app/(app)/leads/_components/filtros-de-clientes";

describe("FiltrosDeClientes en móvil", () => {
  it("nace plegado, se abre con el botón y se cierra al enviar el formulario", async () => {
    const { container } = render(
      <FiltrosDeClientes activos={2}>
        <form>
          <button type="submit">Filtrar</button>
        </form>
      </FiltrosDeClientes>,
    );
    const seccion = container.querySelector("#filtros-de-clientes") as HTMLElement;
    const boton = screen.getByRole("button", { name: /Filtros/ });
    expect(boton.getAttribute("aria-expanded")).toBe("false");
    expect(seccion.className).toContain("hidden");

    fireEvent.click(boton);
    expect(boton.getAttribute("aria-expanded")).toBe("true");
    expect(seccion.className).toContain("block");

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);
    await waitFor(() => expect(boton.getAttribute("aria-expanded")).toBe("false"));
    expect(seccion.className).toContain("hidden");
  });
});
