// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { violacionesGraves } from "@/lib/testing/axe";

import { DataTable, type Column } from "./data-table";
import { Tooltip } from "./tooltip";

// HU-UX-12: el tooltip va en un portal, así el `overflow` del contenedor no lo recorta; se
// abre con el puntero, con el foco y al tocarlo, y su ⓘ en una cabecera no ordena la columna.

beforeAll(() => {
  // jsdom no trae ResizeObserver; el posicionamiento de Radix lo usa al abrir.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(cleanup);

describe("Tooltip con portal", () => {
  it("al pasar el puntero se muestra fuera del contenedor con overflow", () => {
    const { container } = render(
      <div className="overflow-hidden">
        <Tooltip label="Qué es este campo">
          <span>ⓘ</span>
        </Tooltip>
      </div>,
    );
    const disparador = container.querySelector("[data-tooltip]") as HTMLElement;
    expect(screen.queryByRole("tooltip")).toBeNull();

    fireEvent.mouseEnter(disparador);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip.textContent).toBe("Qué es este campo");
    expect(container.contains(tooltip)).toBe(false);
    expect(disparador.getAttribute("aria-describedby")).toBe(tooltip.id);

    fireEvent.mouseLeave(disparador);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("se abre con el foco del teclado y Escape lo cierra", () => {
    const { container } = render(
      <Tooltip label="Ayuda">
        <span>ⓘ</span>
      </Tooltip>,
    );
    const disparador = container.querySelector("[data-tooltip]") as HTMLElement;
    expect(disparador.tabIndex).toBe(0);
    fireEvent.focus(disparador);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("al tocarlo se abre (celular) y un segundo toque no lo cierra", () => {
    const { container } = render(
      <Tooltip label="Ayuda táctil">
        <span>ⓘ</span>
      </Tooltip>,
    );
    const disparador = container.querySelector("[data-tooltip]") as HTMLElement;
    fireEvent.click(disparador);
    expect(screen.getByRole("tooltip")).toBeTruthy();
    fireEvent.pointerDown(disparador);
    fireEvent.click(disparador);
    expect(screen.getByRole("tooltip")).toBeTruthy();
  });

  it("con focusable={false} no agrega tab stop ni descripción (el hijo ya se nombra)", () => {
    const { container } = render(
      <Tooltip label="Leads" focusable={false}>
        <a href="/leads" aria-label="Leads">
          L
        </a>
      </Tooltip>,
    );
    const disparador = container.querySelector("[data-tooltip]") as HTMLElement;
    expect(disparador.hasAttribute("tabindex")).toBe(false);
    fireEvent.focus(screen.getByRole("link", { name: "Leads" }));
    const tooltip = screen.getByRole("tooltip", { hidden: true });
    expect(tooltip.getAttribute("aria-hidden")).toBe("true");
    expect(disparador.hasAttribute("aria-describedby")).toBe(false);
  });

  it("no tiene violaciones graves de accesibilidad abierto", async () => {
    const { container } = render(
      <Tooltip label="Ayuda">
        <span role="img" aria-label="Ayuda">
          ⓘ
        </span>
      </Tooltip>,
    );
    fireEvent.mouseEnter(container.querySelector("[data-tooltip]") as HTMLElement);
    expect(await violacionesGraves(document.body)).toEqual([]);
  });
});

type Fila = { id: string; cliente: string };

const COLUMNAS: Column<Fila>[] = [
  { key: "cliente", header: "Cliente", cell: (f) => f.cliente, info: "Nombre del cliente." },
];
// Más de 7 filas: el DataTable activa el buscador, el orden y las flechas locales.
const FILAS: Fila[] = Array.from({ length: 9 }, (_, i) => ({ id: String(i), cliente: `Cliente ${9 - i}` }));

describe("ⓘ en la cabecera de una tabla", () => {
  it("el clic o Enter en la ayuda no ordena la columna; en la cabecera sí", () => {
    render(<DataTable columns={COLUMNAS} rows={FILAS} getRowKey={(f) => f.id} />);
    const cabecera = screen.getByRole("columnheader", { name: /Cliente/ });
    const ayuda = within(cabecera).getByRole("img", { name: "Nombre del cliente." });

    fireEvent.click(ayuda);
    fireEvent.keyDown(ayuda, { key: "Enter" });
    expect(cabecera.getAttribute("aria-sort")).toBe("none");
    expect(screen.getByRole("tooltip").textContent).toBe("Nombre del cliente.");

    fireEvent.click(cabecera);
    expect(cabecera.getAttribute("aria-sort")).toBe("ascending");
  });
});
