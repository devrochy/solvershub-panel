// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

import { AccionesDeRevision } from "./acciones-de-revision";

// Acciones del master sobre un reporte (SPEC-54, HU-FB-06): aprobar en dos pasos, el botón se bloquea
// mientras se envía (el doble clic no manda dos aprobaciones) y los 409/422 se explican en palabras.

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/lib/toast-store", () => ({ toast }));

const REPORTE = { id: "3f1c2b6e-8a4d-4c1e-9b7a-2d5e6f708192", estado: "en_revision" as const, tenant_name: "Estudio Aurora", titulo: "No carga la agenda" };

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  refresh.mockClear();
  toast.success.mockClear();
  toast.error.mockClear();
});

function abrirAprobar(monto: string) {
  fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
  fireEvent.change(screen.getByLabelText(/Créditos de regalo/), { target: { value: monto } });
  fireEvent.click(screen.getByRole("button", { name: "Revisar monto" }));
}

describe("acciones de revisión de un reporte", () => {
  it("un reporte decidido no ofrece acciones", () => {
    const { container } = render(<AccionesDeRevision reporte={{ ...REPORTE, estado: "aprobado" }} />);
    expect(container.textContent).toBe("");
  });

  it("«Tomar» solo aparece con el reporte recibido", () => {
    render(<AccionesDeRevision reporte={REPORTE} />);
    expect(screen.queryByRole("button", { name: "Tomar" })).toBeNull();
    cleanup();
    render(<AccionesDeRevision reporte={{ ...REPORTE, estado: "recibido" }} />);
    expect(screen.getByRole("button", { name: "Tomar" })).toBeTruthy();
  });

  it("aprobar pide confirmar el monto en un segundo paso y lo envía una sola vez", async () => {
    let responder: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((r) => (responder = r)));
    render(<AccionesDeRevision reporte={REPORTE} />);
    abrirAprobar("3000");
    expect(screen.getByText(/Vas a regalar/).textContent).toMatch(/3\.000 créditos a Estudio Aurora/);
    expect(fetchMock).not.toHaveBeenCalled();

    const confirmar = screen.getByRole("button", { name: /Sí, regalar 3\.000/ });
    fireEvent.click(confirmar);
    fireEvent.click(confirmar);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((screen.getByRole("button", { name: /Aprobando/ }) as HTMLButtonElement).disabled).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/platform/feedback/reports/${REPORTE.id}/aprobar`);
    expect(JSON.parse(String(init.body))).toEqual({ creditos: 3000 });

    await act(async () => responder(new Response(JSON.stringify({ id: REPORTE.id, estado: "aprobado" }), { status: 200 })));
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/3\.000 créditos de regalo para Estudio Aurora/));
    expect(refresh).toHaveBeenCalled();
  });

  it("no deja pasar un monto por encima del tope por reporte", () => {
    render(<AccionesDeRevision reporte={REPORTE} />);
    fireEvent.click(screen.getByRole("button", { name: "Aprobar" }));
    fireEvent.change(screen.getByLabelText(/Créditos de regalo/), { target: { value: "50000" } });
    expect(screen.getByText(/Pasa el tope por reporte/)).toBeTruthy();
    expect((screen.getByRole("button", { name: "Revisar monto" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("el 422 de tope mensual se explica con lo que queda", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Tope.", code: "tope_mensual_excedido", details: { maximo: 10000, regalado: 8000, disponible: 2000 } }), { status: 422 }),
    );
    render(<AccionesDeRevision reporte={REPORTE} />);
    abrirAprobar("3000");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Sí, regalar/ })));
    expect(screen.getByRole("alert").textContent).toMatch(/tope mensual.*10\.000.*8\.000.*quedan 2\.000/);
    // Vuelve al paso del monto para corregirlo.
    expect(screen.getByRole("button", { name: "Revisar monto" })).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("el 409 de reporte ya decidido recarga la vista", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "Ya.", code: "reporte_ya_decidido", details: { estado: "rechazado" } }), { status: 409 }));
    render(<AccionesDeRevision reporte={REPORTE} />);
    abrirAprobar("100");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Sí, regalar/ })));
    expect(screen.getByRole("alert").textContent).toMatch(/ya fue decidido \(rechazado\)/);
    expect(refresh).toHaveBeenCalled();
  });

  it("rechazar por duplicado exige el id del original y manda el cuerpo del contrato", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: REPORTE.id, estado: "rechazado" }), { status: 200 }));
    render(<AccionesDeRevision reporte={REPORTE} />);
    fireEvent.click(screen.getByRole("button", { name: "Rechazar" }));
    fireEvent.change(screen.getByLabelText(/Motivo/), { target: { value: "duplicado" } });
    fireEvent.change(screen.getByLabelText(/Texto para el cliente/), { target: { value: "Ya nos lo habían reportado." } });
    const enviar = screen.getByRole("button", { name: "Rechazar reporte" }) as HTMLButtonElement;
    expect(enviar.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Id del reporte original/), { target: { value: "a1b2c3d4-e5f6-4789-abcd-ef0123456789" } });
    fireEvent.change(screen.getByLabelText(/Nota interna/), { target: { value: "El de Aurora del martes." } });
    expect(enviar.disabled).toBe(false);
    await act(async () => fireEvent.click(enviar));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`/api/platform/feedback/reports/${REPORTE.id}/rechazar`);
    expect(JSON.parse(String(init.body))).toEqual({
      motivo_codigo: "duplicado",
      motivo: "Ya nos lo habían reportado.",
      nota_interna: "El de Aurora del martes.",
      duplicado_de: "a1b2c3d4-e5f6-4789-abcd-ef0123456789",
    });
    expect(toast.success).toHaveBeenCalled();
  });
});
