// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { ChecklistProduccion, type Corrida } from "./checklist-produccion";

const TERMINADA: Corrida = {
  status: "done",
  ready: false,
  requested_at: "2026-10-09T15:00:00Z",
  finished_at: "2026-10-09T15:00:05Z",
  items: [
    { key: "token", label: "Token de acceso", ok: true, detail: "Token válido" },
    {
      key: "number_registered",
      label: "Número registrado en la Cloud API",
      ok: false,
      detail: "La conexión no tiene números.",
      repair_action: "add_number",
    },
    { key: "webhook", label: "Webhook", ok: null, detail: "Todavía no corrió el chequeo" },
  ],
};

function respuesta(body: unknown, status = 200) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe("ChecklistProduccion (HU-CONN-07)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("muestra cada ítem con su estado, la fecha y la reparación de la conexión", () => {
    render(<ChecklistProduccion connectionId="c1" endpoint="/api/x" initial={TERMINADA} />);

    expect(screen.getByText("Falta 1")).toBeTruthy();
    expect(screen.getByText(/Última revisión/)).toBeTruthy();
    expect(screen.getByText("Número registrado en la Cloud API")).toBeTruthy();
    expect(screen.getByText("sin dato")).toBeTruthy();
    const enlace = screen.getByRole("link", { name: "Ver números" });
    expect(enlace.getAttribute("href")).toBe("/conexiones/meta/c1/numeros");
  });

  it("pide la revisión, no la corre: encola y consulta hasta que termina", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url: string, init?: RequestInit) =>
      init?.method === "POST"
        ? respuesta({ status: "queued", requested_at: "2026-10-09T15:00:00Z", items: [] }, 202)
        : respuesta(TERMINADA),
    );
    render(<ChecklistProduccion connectionId="c1" endpoint="/api/x" initial={{ status: "never" }} />);
    expect(screen.getByText("Sin revisar")).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Revisar ahora/ }));
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/x", { method: "POST" });
    expect(screen.getByRole("button", { name: /Revisando/ })).toBeTruthy();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2100);
    });
    expect(screen.getByText("Falta 1")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Revisar ahora/ })).toBeTruthy();
  });

  it("muestra el error si no se pudo encolar", async () => {
    fetchMock.mockImplementation(() => respuesta({ error: "No se pudo encolar la revisión." }, 503));
    render(<ChecklistProduccion endpoint="/api/x" initial={{ status: "never" }} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Revisar ahora/ }));
    });

    expect(screen.getByRole("alert").textContent).toContain("No se pudo encolar");
  });
});
