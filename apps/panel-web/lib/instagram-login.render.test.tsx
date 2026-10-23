// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { InstagramCuentas } from "@/app/(app)/conexiones/instagram/_components/instagram-cuentas";
import { InstagramLogin } from "@/app/(app)/conexiones/instagram/_components/instagram-login";
import { RetornoDeInstagram } from "@/app/(app)/conexiones/instagram/_components/retorno-de-instagram";
import type { CuentaDeInstagram } from "@/lib/instagram-alta";

// Instagram Login en el panel: el botón manda el navegador a Instagram, el retorno canjea el código una sola vez y saca
// code/state de la dirección, y la lista de cuentas hace la prueba de humo con consulta cada 3 s.

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));

const json = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

function cuenta(c: Partial<CuentaDeInstagram> = {}): CuentaDeInstagram {
  return {
    ig_user_id: "17841400", username: "mitienda", login_route: "ig_instagram_login", page_id: null,
    status: "connected", status_reason: null, subscribed_fields: ["messages"], token_expires_at: null, ...c,
  } as CuentaDeInstagram;
}

describe("InstagramLogin", () => {
  const fetchMock = vi.fn();
  const assign = vi.fn();
  const locationOriginal = Object.getOwnPropertyDescriptor(window, "location") as PropertyDescriptor;

  beforeEach(() => {
    fetchMock.mockReset();
    assign.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "location", { value: { assign, pathname: "/x" }, writable: true, configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    Object.defineProperty(window, "location", locationOriginal);  // el doble no se filtra a las demás pruebas
  });

  it("pide la dirección al backend y manda el navegador a Instagram", async () => {
    fetchMock.mockResolvedValueOnce(json({ url: "https://www.instagram.com/oauth/authorize?state=s1", expires_in: 900 }, 201));
    render(<InstagramLogin />);

    fireEvent.click(screen.getByRole("button", { name: "Conectar con Instagram" }));

    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://www.instagram.com/oauth/authorize?state=s1"));
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({ action: "login_start" });
  });

  it("si el backend no la da muestra el motivo y no sale del panel", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "Conectar con Instagram no está disponible en este entorno." }, 409));
    render(<InstagramLogin />);

    fireEvent.click(screen.getByRole("button", { name: "Conectar con Instagram" }));

    await screen.findByText(/no está disponible/);
    expect(assign).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Conectar con Instagram" }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("RetornoDeInstagram", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    refresh.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("canjea el código una sola vez, saca code y state de la dirección y avisa que quedó conectada", async () => {
    window.history.replaceState(null, "", "/conexiones/instagram/callback?code=AQB&state=s1");
    fetchMock.mockResolvedValueOnce(json({ ig_user_id: "17841400", username: "mitienda", subscribed: true }));

    render(<RetornoDeInstagram code="AQB" state="s1" />);

    await screen.findByText(/@mitienda quedó conectada y recibiendo/);
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({
      action: "login_complete", code: "AQB", state: "s1",
    });
    expect(window.location.search).toBe("");  // el código ya no está en la dirección
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalled();
  });

  it("si Meta no confirma la suscripción lo dice y manda a probar la recepción", async () => {
    fetchMock.mockResolvedValueOnce(json({ ig_user_id: "17841400", username: null, subscribed: false }));
    render(<RetornoDeInstagram code="AQB" state="s1" />);

    await screen.findByText(/no confirmó que pueda recibir mensajes/);
    expect(screen.getByText(/Permitir acceso a los mensajes/)).toBeTruthy();
  });

  it("un error del backend se muestra y ofrece volver a intentar", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "El intento venció o no es de esta sesión." }, 400));
    render(<RetornoDeInstagram code="AQB" state="s1" />);

    await screen.findByText(/El intento venció/);
    expect(screen.getByRole("link", { name: "Volver a intentar" }).getAttribute("href")).toBe("/conexiones/instagram");
  });
});

describe("InstagramCuentas", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("muestra la cuenta con su ruta y su estado, y una degradada pide reconectar", () => {
    render(
      <InstagramCuentas
        cuentas={[cuenta(), cuenta({ ig_user_id: "2", username: "otra", login_route: "ig_facebook_login", status: "degraded", status_reason: "El refresco del token falló: reconecta la cuenta." })]}
      />,
    );
    expect(screen.getByText("@mitienda")).toBeTruthy();
    expect(screen.getByText("Instagram Login")).toBeTruthy();
    expect(screen.getByText("Conectada")).toBeTruthy();
    expect(screen.getByText("Degradada")).toBeTruthy();
    expect(screen.getByText(/reconecta la cuenta/)).toBeTruthy();
  });

  it("avisa cuando el acceso de la cuenta está por vencer", () => {
    const vence = new Date(Date.now() + 2.5 * 86_400_000).toISOString();
    render(<InstagramCuentas cuentas={[cuenta({ token_expires_at: vence })]} />);
    expect(screen.getByText(/vence en 2 días/)).toBeTruthy();
  });

  it("la prueba de humo empieza, consulta cada 3 s y termina cuando llega el mensaje", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ since: "2026-10-24T12:00:00Z", wait_seconds: 90 }))
      .mockResolvedValueOnce(json({ arrived: false, likely_cause: "access_to_messages_off" }))
      .mockResolvedValueOnce(json({ arrived: true }));
    render(<InstagramCuentas cuentas={[cuenta()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Probar que llegan los mensajes" }));
    await screen.findByText(/Envía ahora un mensaje directo/);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/meta/instagram/accounts/17841400/diagnostic");

    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });

    await screen.findByText(/Llegó el mensaje de prueba/);
    expect(String(fetchMock.mock.calls[1][0])).toContain("since=2026-10-24T12%3A00%3A00Z");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("si en 90 s no llega nada dice la causa más probable y qué revisar", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ since: "2026-10-24T12:00:00Z", wait_seconds: 6 }))
      .mockResolvedValue(json({ arrived: false, likely_cause: "access_to_messages_off" }));
    render(<InstagramCuentas cuentas={[cuenta()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Probar que llegan los mensajes" }));
    await screen.findByText(/Envía ahora/);
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });

    await screen.findByText("No llegó el mensaje de prueba");
    expect(screen.getByText(/Activa «Permitir acceso a los mensajes»/)).toBeTruthy();
  });

  it("si la cuenta está degradada la causa que se dice es reconectar", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ since: "2026-10-24T12:00:00Z", wait_seconds: 3 }))
      .mockResolvedValue(json({ arrived: false, likely_cause: "token_degraded" }));
    render(<InstagramCuentas cuentas={[cuenta()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Probar que llegan los mensajes" }));
    await screen.findByText(/Envía ahora/);
    await act(async () => { await vi.advanceTimersByTimeAsync(3100); });

    await screen.findByText("El acceso a la cuenta falló");
  });

  it("un error de la API en la prueba se muestra y no deja la prueba colgada", async () => {
    fetchMock.mockResolvedValueOnce(json({ error: "No encontré esa cuenta de Instagram." }, 404));
    render(<InstagramCuentas cuentas={[cuenta()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Probar que llegan los mensajes" }));

    await screen.findByText("No encontré esa cuenta de Instagram.");
    expect((screen.getByRole("button", { name: "Probar que llegan los mensajes" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("al salir de la pantalla se deja de consultar", async () => {
    fetchMock.mockResolvedValueOnce(json({ since: "2026-10-24T12:00:00Z", wait_seconds: 90 })).mockResolvedValue(json({ arrived: false }));
    const { unmount } = render(<InstagramCuentas cuentas={[cuenta()]} />);

    fireEvent.click(screen.getByRole("button", { name: "Probar que llegan los mensajes" }));
    await screen.findByText(/Envía ahora/);
    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });

    expect(fetchMock).toHaveBeenCalledTimes(1);  // la consulta pendiente no se hizo
  });
});
