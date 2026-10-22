// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { NewConnectionDialog } from "@/app/(app)/conexiones/_components/new-connection-dialog";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
}));

class ResizeObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const fetchMock = vi.fn();

beforeEach(() => {
  push.mockReset();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(
    new Response(
      JSON.stringify({
        categories: [
          {
            category: "comunicacion",
            label: "Comunicación",
            items: [
              {
                id: "whatsapp_meta",
                label: "WhatsApp",
                description: "Meta Cloud API",
                available: true,
                setup_kind: "wizard",
                url: "/admin/conexiones/wizard/whatsapp/elegir-entorno",
                has_schema: true,
              },
              {
                id: "whatsapp_waweb",
                label: "WhatsApp (vincular por QR)",
                description: "Número propio por QR",
                available: true,
                setup_kind: "wizard",
                url: "/admin/conexiones/waweb",
                has_schema: false,
              },
              {
                id: "instagram_meta",
                label: "Instagram",
                description: "Mensajes directos vía Meta",
                available: false,
                setup_kind: "wizard",
                url: null,
                has_schema: false,
              },
            ],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("ResizeObserver", ResizeObserverFalso);
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.releasePointerCapture = () => undefined;
  window.HTMLElement.prototype.setPointerCapture = () => undefined;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function abrir() {
  render(<NewConnectionDialog />);
  fireEvent.click(screen.getByRole("button", { name: "Agregar conexión" }));
}

describe("alta de conexión", () => {
  it("elegir WhatsApp navega al asistente, sin botones por tarjeta", async () => {
    await abrir();
    const tarjeta = await screen.findByRole("button", { name: /Meta Cloud API/ });
    fireEvent.click(tarjeta);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/conexiones/whatsapp"));
    expect(screen.queryByRole("button", { name: "Abrir asistente" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Configurar" })).toBeNull();
  });

  it("la conexión QR navega a WhatsApp Web", async () => {
    await abrir();
    fireEvent.click(await screen.findByRole("button", { name: /Número propio por QR/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/conexiones/waweb"));
  });

  it("las no disponibles solo muestran Próximamente y no navegan", async () => {
    await abrir();
    const tarjeta = await screen.findByRole("button", { name: /Instagram/ });
    expect((tarjeta as HTMLButtonElement).disabled).toBe(true);
    expect(within(tarjeta).getByText("Próximamente")).toBeTruthy();
    fireEvent.click(tarjeta);
    expect(push).not.toHaveBeenCalled();
  });
});
