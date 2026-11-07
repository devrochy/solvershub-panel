// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ConsentimientoDatosDelCliente } from "@/components/domain/cliente/consentimiento-datos";
import { FeedbackProviders } from "@/components/ui/providers";
import type { ConsentimientoDatos } from "@/lib/aviso-datos";
import { esPropietarioOPlataforma } from "@/lib/clientes";

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

function montar(puedeRetirar = true) {
  return render(
    <FeedbackProviders>
      <ConsentimientoDatosDelCliente leadId="lead-1" puedeRetirar={puedeRetirar} />
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

  // agent-core#692: retirar datos es solo del propietario o la plataforma. La ficha recibe `puedeRetirar`
  // de `esPropietarioOPlataforma(me)`; aquí se prueba cada sesión de punta a punta (sesión → botón).
  describe("quién ve «Retirar sus datos»", () => {
    const sesiones = {
      propietario: { role: "user", tenant: { role: "owner" }, permissions: { leads: "write" } },
      master: { role: "master", permissions: {} },
      tester: { role: "tester", permissions: {} },
      colaboradorConClientesEnEscritura: { role: "user", tenant: { role: "colaborador" }, permissions: { leads: "write" } },
    };

    it.each([
      ["propietario", sesiones.propietario, true],
      ["master", sesiones.master, true],
      ["tester", sesiones.tester, true],
      ["colaborador con Clientes en escritura", sesiones.colaboradorConClientesEnEscritura, false],
    ] as const)("%s", async (_nombre, me, visible) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(otorgado), { status: 200 }));
      montar(esPropietarioOPlataforma(me));
      // El estado del consentimiento se lee igual para todos.
      expect(await screen.findByText("Aceptó el tratamiento de datos")).toBeTruthy();
      expect(screen.getByText(/en el chat, por el cliente/)).toBeTruthy();
      expect(Boolean(screen.queryByRole("button", { name: "Retirar sus datos" }))).toBe(visible);
    });

    it("sin la prop, por defecto no se ofrece (cerrado ante la duda)", async () => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(otorgado), { status: 200 }));
      render(
        <FeedbackProviders>
          <ConsentimientoDatosDelCliente leadId="lead-1" />
        </FeedbackProviders>,
      );
      expect(await screen.findByText("Aceptó el tratamiento de datos")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Retirar sus datos" })).toBeNull();
    });

    it("si el servidor responde 403 se muestra su mensaje y los datos no cambian", async () => {
      fetchMock
        .mockResolvedValueOnce(new Response(JSON.stringify(otorgado), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ error: "Solo el propietario del negocio puede retirar los datos de un cliente." }), { status: 403 }),
        );
      montar(true);
      fireEvent.click(await screen.findByRole("button", { name: "Retirar sus datos" }));
      fireEvent.click(await screen.findByRole("button", { name: "Retirar datos" }));
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
      expect(await screen.findByText("Solo el propietario del negocio puede retirar los datos de un cliente.")).toBeTruthy();
      expect(screen.queryByText(/Se retiraron/)).toBeNull();
      expect(screen.getByText("Aceptó el tratamiento de datos")).toBeTruthy();
    });
  });
});
