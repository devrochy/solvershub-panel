// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { estadoLegible, CONVERSATION_STATUS, StatusBadge } from "@/components/domain/status-badge";
import { formatearIdentificador, nombreDelChat } from "@/lib/conversaciones/nombre";
import { violacionesGraves } from "@/lib/testing/axe";

import { Contador } from "./contador";
import { DataTable } from "./data-table";
import { EstadoDeError } from "./estado-de-error";
import { SegmentedControl } from "./segmented-control";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(cleanup);

const OPCIONES = [
  { value: "", label: "Todas" },
  { value: "open", label: "Abiertas" },
  { value: "closed", label: "Cerradas" },
];

describe("SegmentedControl", () => {
  it("con botones marca la opción y avisa el cambio", async () => {
    const onChange = vi.fn();
    const { container } = render(<SegmentedControl label="Estado" options={OPCIONES} value="open" onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Abiertas", pressed: true })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerradas" }));
    expect(onChange).toHaveBeenCalledWith("closed");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("← y → mueven el foco y dan la vuelta", () => {
    render(<SegmentedControl label="Estado" options={OPCIONES} value="" onChange={vi.fn()} />);
    const primera = screen.getByRole("button", { name: "Todas" });
    primera.focus();
    fireEvent.keyDown(primera, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Cerradas" }));
  });

  it("con href son enlaces y la opción actual lleva aria-current", () => {
    render(
      <SegmentedControl label="Estado" value="open" options={OPCIONES.map((o) => ({ ...o, href: `/x?e=${o.value}` }))} />,
    );
    expect(screen.getByRole("link", { name: "Abiertas" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Todas" }).getAttribute("aria-current")).toBeNull();
  });
});

describe("Contador", () => {
  it("desde 100 muestra 99+ y lleva el texto para lectores de pantalla", () => {
    render(<Contador valor={120} etiqueta="Más de 99 mensajes" />);
    expect(screen.getByText("99+").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("Más de 99 mensajes")).toBeTruthy();
  });
});

describe("EstadoDeError", () => {
  it("dice qué pasó y pliega el detalle técnico", async () => {
    const { container } = render(<EstadoDeError titulo="No cargó" descripcion="Vuelve a intentarlo." detalle="502" />);
    expect(screen.getByRole("alert").textContent).toContain("No cargó");
    expect(container.querySelector("details")?.open).toBe(false);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("DataTable con getRowHref", () => {
  const props = {
    columns: [{ key: "nombre", header: "Nombre", cell: (f: { id: string }) => f.id }],
    rows: [{ id: "ana" }],
    getRowKey: (f: { id: string }) => f.id,
  };

  it("cada fila tiene un solo enlace, con nombre propio", async () => {
    const { container } = render(
      <DataTable {...props} getRowHref={(f) => `/x/${f.id}`} getRowLabel={(f) => `Abrir el chat de ${f.id}`} />,
    );
    const enlaces = screen.getAllByRole("link");
    expect(enlaces).toHaveLength(1);
    expect(enlaces[0].getAttribute("aria-label")).toBe("Abrir el chat de ana");
    expect(enlaces[0].getAttribute("href")).toBe("/x/ana");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("sin getRowHref no agrega columna", () => {
    const { container } = render(<DataTable {...props} />);
    expect(container.querySelectorAll("th")).toHaveLength(1);
  });
});

describe("estados y nombres legibles", () => {
  it("un estado fuera del mapa nunca sale crudo", () => {
    render(<StatusBadge value="en_revision_manual" map={CONVERSATION_STATUS} />);
    expect(screen.getByText("En revision manual")).toBeTruthy();
    expect(estadoLegible("pending")).toBe("Pendiente");
    expect(estadoLegible("")).toBe("Sin estado");
  });

  it("formatea el celular colombiano y deja igual lo demás", () => {
    expect(formatearIdentificador("573000000002")).toBe("+57 300 000 0002");
    expect(formatearIdentificador("+573000000002")).toBe("+57 300 000 0002");
    // Un identificador numérico de otro canal no se confunde con un teléfono.
    expect(formatearIdentificador("17841400000000000")).toBe("17841400000000000");
    expect(nombreDelChat({ external_id: "573000000002" })).toBe("+57 300 000 0002");
    expect(nombreDelChat({ external_id: "web:cf78abcd" })).toBe("Visitante web · cf78");
  });
});
