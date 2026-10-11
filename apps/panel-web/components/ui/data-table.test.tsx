// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { violacionesGraves } from "@/lib/testing/axe";

import { DataTable, type Column } from "./data-table";

type Fila = { id: string; cliente: string; total: string };

const COLUMNAS: Column<Fila>[] = [
  { key: "cliente", header: "Cliente", cell: (f) => f.cliente },
  { key: "total", header: "Total", cell: (f) => f.total, align: "right", info: "Valor con impuestos." },
];

const FILAS: Fila[] = [
  { id: "1", cliente: "Ana Prueba", total: "$ 120.000" },
  { id: "2", cliente: "Luis Prueba", total: "$ 80.000" },
];

afterEach(cleanup);

describe("DataTable (HU-UI-04)", () => {
  it("con datos muestra una fila por registro bajo sus encabezados", () => {
    render(<DataTable columns={COLUMNAS} rows={FILAS} getRowKey={(f) => f.id} />);

    const tabla = screen.getByRole("table");
    expect(within(tabla).getByRole("columnheader", { name: /Cliente/ })).toBeTruthy();
    const filas = within(tabla).getAllByRole("row");
    expect(filas).toHaveLength(1 + FILAS.length);
    expect(within(filas[1]).getByText("Ana Prueba")).toBeTruthy();
  });

  it("alinea a la derecha las columnas numéricas", () => {
    render(<DataTable columns={COLUMNAS} rows={FILAS} getRowKey={(f) => f.id} />);
    expect(screen.getByText("$ 120.000").closest("td")?.className).toMatch(/text-right/);
  });

  it("sin datos muestra el estado vacío en lugar de una tabla", () => {
    render(
      <DataTable
        columns={COLUMNAS}
        rows={[]}
        getRowKey={(f) => f.id}
        emptyTitle="Todavía no hay pedidos"
        emptyDescription="Cuando un cliente compre, aparece aquí."
      />,
    );
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.getByText("Todavía no hay pedidos")).toBeTruthy();
    expect(screen.getByText("Cuando un cliente compre, aparece aquí.")).toBeTruthy();
  });

  it("no tiene violaciones graves de accesibilidad, con y sin datos", async () => {
    const conDatos = render(<DataTable columns={COLUMNAS} rows={FILAS} getRowKey={(f) => f.id} />);
    expect(await violacionesGraves(conDatos.container)).toEqual([]);
    cleanup();
    const vacia = render(<DataTable columns={COLUMNAS} rows={[]} getRowKey={(f) => f.id} />);
    expect(await violacionesGraves(vacia.container)).toEqual([]);
  });
});
