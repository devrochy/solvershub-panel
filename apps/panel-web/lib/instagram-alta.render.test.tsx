// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { InstagramAlta } from "@/app/(app)/conexiones/instagram/_components/instagram-alta";
import type { EstadoInstagram } from "@/lib/instagram-alta";

// Alta de Instagram: el intento se pide al abrir, el popup se abre en el mismo clic, el `code` viaja a la API con
// el intento y solo se conectan las cuentas elegibles que la persona marca.

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const ESTADO: EstadoInstagram = {
  meta_configured: true,
  app_id: "123",
  config_id: "cfg-ig",
  graph_api_version: "v21.0",
  missing_settings: [],
  plan_includes: true,
  login_available: false,
  login_missing: [],
};

const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

describe("InstagramAlta", () => {
  const fetchMock = vi.fn();
  const login = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    login.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    window.FB = { init: vi.fn(), login };
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    delete window.FB;
  });

  const accion = (n: number) => JSON.parse(String((fetchMock.mock.calls[n] as [string, RequestInit])[1].body));

  async function abrirPopup() {
    const boton = await screen.findByRole("button", { name: /Conectar con Facebook/ });
    await waitFor(() => expect((boton as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(boton);
  }

  it("sin plan que incluya Instagram no pide intento ni muestra el botón", () => {
    render(<InstagramAlta estado={{ ...ESTADO, plan_includes: false }} />);
    expect(screen.getByText("Tu plan no incluye Instagram")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Conectar con Facebook/ })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("recorre el alta: intento, popup con el config_id propio, descubrir y conectar solo lo elegido", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ attempt: "intento-1", expires_in: 900 }, 201))
      .mockResolvedValueOnce(
        json({
          connection_id: "conn-1",
          pages_without_instagram: 0,
          accounts: [
            { ig_user_id: "11", username: "tienda_norte", page_id: "1", page_name: "Tienda Norte", eligible: true, already_connected: false },
            { ig_user_id: "22", username: "sin_rol", page_id: "2", page_name: "Otra", eligible: false, reason: "Te falta el rol de mensajes.", already_connected: false },
          ],
        }),
      )
      .mockResolvedValueOnce(
        json({
          connection_id: "conn-1",
          connected: [{ ig_user_id: "11", channel_connection_id: "cc-1", subscribed: true, subscribed_fields: ["messages"] }],
          skipped: [],
        }),
      );

    render(<InstagramAlta estado={ESTADO} />);
    await abrirPopup();
    expect(accion(0)).toEqual({ action: "attempt" });
    expect(login).toHaveBeenCalledTimes(1);
    const [callback, opciones] = login.mock.calls[0];
    expect(opciones).toMatchObject({ config_id: "cfg-ig", response_type: "code", override_default_response_type: true });
    callback({ authResponse: { code: "codigo-1" } });

    await screen.findByText("@tienda_norte");
    expect(accion(1)).toEqual({ action: "discover", code: "codigo-1", attempt: "intento-1" });
    expect(screen.getByText("Te falta el rol de mensajes.")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "@sin_rol" }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Conectar 1 cuenta" }));
    await screen.findByText("Tu cuenta de Instagram quedó conectada y recibiendo mensajes.");
    expect(accion(2)).toEqual({ action: "connect", connection_id: "conn-1", ig_user_ids: ["11"] });
    expect(refresh).toHaveBeenCalled();
  });

  it("si Meta no confirma la suscripción lo dice, nombra la cuenta y recuerda el interruptor de mensajes", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ attempt: "i", expires_in: 900 }, 201))
      .mockResolvedValueOnce(
        json({
          connection_id: "c",
          pages_without_instagram: 0,
          accounts: [{ ig_user_id: "11", username: "tienda_norte", page_id: "1", page_name: "P", eligible: true, already_connected: false }],
        }),
      )
      .mockResolvedValueOnce(
        json({
          connection_id: "c",
          connected: [{ ig_user_id: "11", channel_connection_id: "cc", subscribed: false, subscribed_fields: [] }],
          skipped: [{ ig_user_id: "33", code: "asset_claimed", message: "Esa cuenta ya está en otro negocio." }],
        }),
      );
    render(<InstagramAlta estado={ESTADO} />);
    await abrirPopup();
    login.mock.calls[0][0]({ authResponse: { code: "c" } });
    fireEvent.click(await screen.findByRole("button", { name: "Conectar 1 cuenta" }));

    await screen.findByText("Meta no confirmó la suscripción de estas cuentas");
    expect(screen.getByText(/Permitir acceso a los mensajes/)).toBeTruthy();
    expect(screen.getByText("Esa cuenta ya está en otro negocio", { exact: false })).toBeTruthy();
    expect(screen.queryByText(/recibiendo mensajes\./)).toBeNull();
  });

  it("si la persona no administra cuentas de Instagram explica los requisitos", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ attempt: "i", expires_in: 900 }, 201))
      .mockResolvedValueOnce(json({ connection_id: "c", pages_without_instagram: 2, accounts: [] }));
    render(<InstagramAlta estado={ESTADO} />);
    await abrirPopup();
    login.mock.calls[0][0]({ authResponse: { code: "c" } });

    await screen.findByText(/No encontramos cuentas de Instagram/);
    expect(screen.getByText(/2 de tus Páginas no tienen Instagram vinculado/, { exact: false })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Conectar \d/ })).toBeNull();
  });

  it("si se cierra el popup sin autorizar avisa y no llama a descubrir", async () => {
    fetchMock.mockResolvedValueOnce(json({ attempt: "i", expires_in: 900 }, 201));
    render(<InstagramAlta estado={ESTADO} />);
    await abrirPopup();
    login.mock.calls[0][0]({ authResponse: null });
    await screen.findByText(/Cerraste la ventana de Facebook/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("si descubrir falla muestra el error y pide un intento nuevo (el anterior se consumió)", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ attempt: "i1", expires_in: 900 }, 201))
      .mockResolvedValueOnce(json({ error: "El código venció." }, 400))
      .mockResolvedValueOnce(json({ attempt: "i2", expires_in: 900 }, 201));
    render(<InstagramAlta estado={ESTADO} />);
    await abrirPopup();
    login.mock.calls[0][0]({ authResponse: { code: "c" } });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(accion(2)).toEqual({ action: "attempt" });
    await screen.findByRole("alert");
  });
});
