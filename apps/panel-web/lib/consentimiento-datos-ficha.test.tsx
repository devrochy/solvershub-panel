// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ConsentimientoDatosDelCliente } from "@/components/domain/cliente/consentimiento-datos";
import { FeedbackProviders } from "@/components/ui/providers";
import type { ConsentimientoDatos } from "@/lib/aviso-datos";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
}));

const fetchMock = vi.fn();

const otorgado: ConsentimientoDatos = {
  aviso_activo: true,
  estado: "otorgado",
  historial: [
    { estado: "otorgado", origen: "aviso_en_chat", version_aviso: "v1", evidencia: "mensaje:1 «acepto»", quien: "el cliente", created_at: "2026-10-28T10:00:00Z" },
  ],
};

function montar() {
  return render(
    <FeedbackProviders>
      <ConsentimientoDatosDelCliente leadId="lead-1" />
    </FeedbackProviders>,
  );
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("ConsentimientoDatosDelCliente", () => {
  it("no aparece si el negocio no usa el aviso y el cliente no tiene historia", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ aviso_activo: false, estado: "sin_aviso", historial: [] }), { status: 200 }));
    const { container } = montar();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(container.textContent).toBe("");
  });

  it("muestra qué respondió el cliente, cómo y cuándo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(otorgado), { status: 200 }));
    montar();
    expect(await screen.findByText("Aceptó el tratamiento de datos")).toBeTruthy();
    expect(screen.getByText(/en el chat, por el cliente/)).toBeTruthy();
  });

  it("retirar los datos pide confirmación, llama al endpoint y recarga el estado", async () => {
    const revocado: ConsentimientoDatos = { ...otorgado, estado: "revocado" };
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify(otorgado), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...revocado, datos_retirados: ["email", "hobby"] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(revocado), { status: 200 }));
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Retirar sus datos" }));
    fireEvent.click(await screen.findByRole("button", { name: "Retirar datos" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/leads/lead-1/consentimiento-datos/revocar");
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
    expect(await screen.findByText(/Se retiraron 2 dato\(s\) del perfil/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Retirar sus datos" })).toBeNull();
  });

  it("si cancela la confirmación no se llama al endpoint", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(otorgado), { status: 200 }));
    montar();
    fireEvent.click(await screen.findByRole("button", { name: "Retirar sus datos" }));
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
