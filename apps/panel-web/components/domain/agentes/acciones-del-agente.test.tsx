// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import type { AccionEnEditor } from "@/lib/acciones-del-agente";
import { violacionesGraves } from "@/lib/testing/axe";

import { AccionesDelAgente } from "./acciones-del-agente";

afterEach(cleanup);

const ACCIONES: Record<string, AccionEnEditor> = {
  crear_pedido: { activo: true, tope: null, confirmar: false },
  create_calendar_event: { activo: true, tope: 2, confirmar: true },
  cancel_calendar_event: { activo: false, tope: null, confirmar: false },
  accion_retirada: { activo: true, tope: null, confirmar: false },
};

describe("AccionesDelAgente", () => {
  it("agrupa por lo que hacen, con nombres para el dueño y sin palabras técnicas", async () => {
    const { container } = render(<AccionesDelAgente acciones={ACCIONES} cambiar={vi.fn()} />);
    const citas = screen.getByRole("region", { name: "Citas" });
    expect(within(citas).getByRole("switch", { name: "Agendar una cita" })).toHaveProperty("ariaChecked", "true");
    expect(within(citas).getByRole("switch", { name: "Cancelar una cita" })).toHaveProperty("ariaChecked", "false");
    expect(within(citas).getByText("Hasta 2 veces por conversación · Pide confirmación")).toBeTruthy();
    expect(screen.getByRole("region", { name: "Pedidos" })).toBeTruthy();
    expect(screen.getByRole("region", { name: "Otras acciones" })).toBeTruthy();
    expect(container.textContent).not.toMatch(/\b(tools?|packs?|plugins?)\b/i);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("apagar, poner tope y pedir confirmación cambian solo esa acción", () => {
    const cambiar = vi.fn();
    render(<AccionesDelAgente acciones={ACCIONES} cambiar={cambiar} />);
    fireEvent.click(screen.getByRole("switch", { name: "Crear el pedido" }));
    expect(cambiar).toHaveBeenLastCalledWith({ ...ACCIONES, crear_pedido: { activo: false, tope: null, confirmar: false } });

    const pedidos = screen.getByRole("region", { name: "Pedidos" });
    fireEvent.click(within(pedidos).getByRole("checkbox", { name: "Ponerle un tope por conversación" }));
    expect(cambiar).toHaveBeenLastCalledWith({ ...ACCIONES, crear_pedido: { activo: true, tope: 5, confirmar: false } });
    fireEvent.click(within(pedidos).getByRole("checkbox", { name: "Pedir confirmación antes de hacerla" }));
    expect(cambiar).toHaveBeenLastCalledWith({ ...ACCIONES, crear_pedido: { activo: true, tope: null, confirmar: true } });
  });

  it("cambia el tope escrito", () => {
    const cambiar = vi.fn();
    render(<AccionesDelAgente acciones={ACCIONES} cambiar={cambiar} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Veces por conversación para Agendar una cita" }), { target: { value: "7" } });
    expect(cambiar).toHaveBeenLastCalledWith({ ...ACCIONES, create_calendar_event: { activo: true, tope: 7, confirmar: true } });
  });

  it("una acción con error se puede quitar del agente", () => {
    const cambiar = vi.fn();
    render(
      <AccionesDelAgente acciones={ACCIONES} cambiar={cambiar} erroresPorAccion={{ accion_retirada: "Esta acción ya no existe." }} />,
    );
    expect(screen.getByRole("alert").textContent).toContain("Esta acción ya no existe.");
    fireEvent.click(screen.getByRole("button", { name: "Quitar del agente" }));
    expect(cambiar).toHaveBeenLastCalledWith({ ...ACCIONES, accion_retirada: { ...ACCIONES.accion_retirada, quitada: true } });
  });

  it("una acción quitada se puede deshacer", () => {
    const cambiar = vi.fn();
    const acciones = { ...ACCIONES, accion_retirada: { ...ACCIONES.accion_retirada, quitada: true } };
    render(<AccionesDelAgente acciones={acciones} cambiar={cambiar} />);
    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));
    expect(cambiar).toHaveBeenLastCalledWith({ ...acciones, accion_retirada: { ...ACCIONES.accion_retirada, quitada: false } });
  });

  it("sin acciones lo dice y explica dónde está la búsqueda en documentos", () => {
    render(<AccionesDelAgente acciones={{}} cambiar={vi.fn()} conConocimiento />);
    expect(screen.getByText(/todavía no tiene acciones/)).toBeTruthy();
    expect(screen.getByText(/paso «Memoria y conocimiento»/)).toBeTruthy();
  });
});
