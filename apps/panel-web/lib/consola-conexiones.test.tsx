// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { ConsolaConexiones } from "@/app/(app)/conexiones/_components/consola-conexiones";
import type { ConnectionsConsole } from "@/lib/api/types";
import { consolaConexiones } from "@/lib/testing/fixtures";

// Sin edición: la lista no monta el menú de pausar (un componente de cliente).
const SIN_EDICION: ConnectionsConsole = { ...consolaConexiones, can_edit: false };

afterEach(cleanup);

describe("consola de conexiones", () => {
  it("en lista pinta la tabla con sus filas", () => {
    render(<ConsolaConexiones consola={SIN_EDICION} webhookUrl={null} vista="lista" />);

    expect(screen.getByRole("table")).toBeTruthy();
    expect(screen.getAllByText("WhatsApp principal").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Google Calendar").length).toBeGreaterThan(0);
  });

  it("en cuadrícula no pinta la tabla y sí una tarjeta por conexión", () => {
    render(<ConsolaConexiones consola={SIN_EDICION} webhookUrl={null} vista="cuadricula" />);

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getAllByText(/Atienden:/).length).toBe(1);
    expect(screen.getByText("Integración del negocio")).toBeTruthy();
    expect(screen.getAllByText("Funciona").length).toBe(2);
    expect(screen.getAllByText("Últimos 7 días").length).toBe(2);
  });

  it("sin conexiones, la cuadrícula muestra el estado vacío", () => {
    render(
      <ConsolaConexiones
        consola={{ ...SIN_EDICION, items: [], total: 0, has_more: false }}
        webhookUrl={null}
        vista="cuadricula"
      />,
    );

    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Conecta tu primer canal")).toBeTruthy();
  });
});
