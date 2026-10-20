// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { violacionesGraves } from "@/lib/testing/axe";

import { EtiquetaDeTipo, LeyendaDeTipos, SelectorDeColor } from "./tipo-de-cita";

beforeAll(() => {
  // Radix mide los ítems con ResizeObserver; jsdom no lo trae.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(cleanup);

describe("tipo de cita en la Agenda (HU-UX-08)", () => {
  it("la leyenda lista cada tipo con su código y el bloqueo", async () => {
    const { container } = render(
      <LeyendaDeTipos
        tipos={[
          { id: "1", name: "Valoración", color: "cat-1", codigo: "VAL" },
          { id: "2", name: "Control", color: "cat-4", codigo: "" },
        ]}
      />,
    );
    const lista = screen.getByRole("list", { name: "Tipos de cita" });
    expect(lista.textContent).toContain("VALValoración");
    // Sin código guardado, se deriva del nombre.
    expect(lista.textContent).toContain("CONControl");
    expect(lista.textContent).toContain("Bloqueo");
    expect(container.querySelector(".bg-data-4")).not.toBeNull();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("sin tipos no hay leyenda", () => {
    const { container } = render(<LeyendaDeTipos tipos={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("un color fuera de la paleta se ve neutro", () => {
    const { container } = render(<EtiquetaDeTipo tipo={{ name: "X", color: "#ff0000", codigo: "X" }} />);
    expect(container.querySelector(".bg-border-strong")).not.toBeNull();
  });

  it("el selector ofrece solo las 4 opciones de la paleta, con nombre", async () => {
    const { container } = render(
      <form>
        <SelectorDeColor name="color" defaultValue="cat-2" idBase="c" />
      </form>,
    );
    const opciones = screen.getAllByRole("radio");
    expect(opciones.map((o) => o.getAttribute("aria-label"))).toEqual(["Azul", "Dorado", "Turquesa", "Violeta"]);
    expect(screen.getByRole("radio", { name: "Dorado" }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: "Violeta" }));
    expect(screen.getByRole("radio", { name: "Violeta" }).getAttribute("aria-checked")).toBe("true");
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
