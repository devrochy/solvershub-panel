// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { MessengerAlta } from "@/app/(app)/conexiones/messenger/_components/messenger-alta";
import type { EstadoMessenger } from "@/lib/messenger-alta";

// Alta de Messenger: el intento se pide al abrir, el popup se abre en el mismo clic, el `code` viaja
// a la API con el intento y solo se conectan las Páginas elegibles que la persona marca.

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const ESTADO: EstadoMessenger = {
  meta_configured: true,
  app_id: "123",
  config_id: "cfg-1",
  graph_api_version: "v21.0",
  missing_settings: [],
  plan_includes: true,
};

const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

describe("MessengerAlta", () => {
  const fetchMock = vi.fn();
  const login = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    login.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    // El SDK ya está cargado: el hook lo marca listo sin tocar el DOM.
    window.FB = { init: vi.fn(), login };
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete window.FB;
  });

  const accion = (n: number) => JSON.parse(String((fetchMock.mock.calls[n] as [string, RequestInit])[1].body));

  it("sin plan que incluya Messenger no pide intento ni muestra el botón", () => {
    render(<MessengerAlta estado={{ ...ESTADO, plan_includes: false }} />);
    expect(screen.getByText("Tu plan no incluye Messenger")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Conectar con Facebook/ })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recorre el alta: intento, popup con el config_id, descubrir y conectar solo lo elegido", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ attempt: "intento-1", expires_in: 900 }, 201))
      .mockResolvedValueOnce(
        json({
          connection_id: "conn-1",
          pages: [
            { page_id: "11", name: "Tienda Norte", eligible: true, already_connected: false },
            { page_id: "22", name: "Sin rol", eligible: false, reason: "Te falta el rol de mensajes.", already_connected: false },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json({
          connection_id: "conn-1",
          connected: [{ page_id: "11", channel_connection_id: "cc-1", subscribed: true, subscribed_fields: ["messages"] }],
          skipped: [],
        }),
      );

    render(<MessengerAlta estado={ESTADO} />);
    const boton = await screen.findByRole("button", { name: /Conectar con Facebook/ });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
    expect(accion(0)).toEqual({ action: "attempt" });

    fireEvent.click(boton);
    expect(login).toHaveBeenCalledTimes(1);
    const [callback, opciones] = login.mock.calls[0];
    expect(opciones).toMatchObject({ config_id: "cfg-1", response_type: "code", override_default_response_type: true });
    callback({ authResponse: { code: "codigo-1" } });

    await screen.findByText("Tienda Norte");
    expect(accion(1)).toEqual({ action: "discover", code: "codigo-1", attempt: "intento-1" });
    // La Página sin rol se explica y no se puede marcar.
    expect(screen.getByText("Te falta el rol de mensajes.")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Sin rol" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Conectar 1 Página" }));
    await screen.findByText("Tu Página quedó conectada y recibiendo mensajes.");
    expect(accion(2)).toEqual({ action: "connect", connection_id: "conn-1", page_ids: ["11"] });
    expect(refresh).toHaveBeenCalled();
  });

  it("si Meta no confirma la suscripción lo dice y nombra la Página", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ attempt: "i", expires_in: 900 }, 201))
      .mockResolvedValueOnce(
        json({ connection_id: "c", pages: [{ page_id: "11", name: "Tienda Norte", eligible: true, already_connected: false }] }),
      )
      .mockResolvedValueOnce(
        json({
          connection_id: "c",
          connected: [{ page_id: "11", channel_connection_id: "cc", subscribed: false, subscribed_fields: [] }],
          skipped: [{ page_id: "33", code: "claimed", message: "Esa Página ya está en otro negocio." }],
        }),
      );
    render(<MessengerAlta estado={ESTADO} />);
    const boton = await screen.findByRole("button", { name: /Conectar con Facebook/ });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(boton);
    login.mock.calls[0][0]({ authResponse: { code: "c" } });
    fireEvent.click(await screen.findByRole("button", { name: "Conectar 1 Página" }));

    await screen.findByText("Meta no confirmó la suscripción de estas Páginas");
    expect(screen.getByText("Esa Página ya está en otro negocio", { exact: false })).toBeTruthy();
    expect(screen.queryByText(/recibiendo mensajes\./)).toBeNull();
  });

  it("si se cierra el popup sin autorizar avisa y no llama a descubrir", async () => {
    fetchMock.mockResolvedValueOnce(json({ attempt: "i", expires_in: 900 }, 201));
    render(<MessengerAlta estado={ESTADO} />);
    const boton = await screen.findByRole("button", { name: /Conectar con Facebook/ });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(boton);
    login.mock.calls[0][0]({ authResponse: null });
    await screen.findByText(/Cerraste la ventana de Facebook/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("si descubrir falla muestra el error y pide un intento nuevo (el anterior se consumió)", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ attempt: "i1", expires_in: 900 }, 201))
      .mockResolvedValueOnce(json({ error: "El código venció." }, 400))
      .mockResolvedValueOnce(json({ attempt: "i2", expires_in: 900 }, 201));
    render(<MessengerAlta estado={ESTADO} />);
    const boton = await screen.findByRole("button", { name: /Conectar con Facebook/ });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(boton);
    login.mock.calls[0][0]({ authResponse: { code: "c" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(accion(2)).toEqual({ action: "attempt" });
    await screen.findByRole("alert");
  });
});
