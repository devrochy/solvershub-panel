import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de Configuración → Multimedia (SPEC-04): reenvía solo los campos conocidos,
// conserva el error de la API y no acepta acciones o tipos arbitrarios.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined),
  }),
}));

import { PUT } from "@/app/api/settings/media/route";
import { POST } from "@/app/api/settings/media/test/route";

describe("BFF de multimedia", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    cookies.set("panel_session", "token-de-prueba");
    cookies.set("panel_tenant", "t-1");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("guarda audio con la sesión y el negocio activos", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const res = await PUT(
      new Request("http://panel.test/api/settings/media", {
        method: "PUT",
        body: JSON.stringify({ action: "audio", enabled: true, provider: "groq", model: "whisper-large-v3-turbo", api_key: "gsk_x" }),
      }),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/settings\/media\/audio$/);
    expect(init.method).toBe("PUT");
    expect(init.headers).toEqual({
      Authorization: "Bearer token-de-prueba",
      "Content-Type": "application/json",
      "X-Tenant-Id": "t-1",
    });
    expect(JSON.parse(String(init.body))).toEqual({
      enabled: true,
      provider: "groq",
      model: "whisper-large-v3-turbo",
      api_key: "gsk_x",
    });
  });

  it("guarda visión con su modo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const res = await PUT(
      new Request("http://panel.test/api/settings/media", {
        method: "PUT",
        body: JSON.stringify({
          action: "vision",
          enabled: true,
          mode: "sin_descripcion",
          provider: "deepseek",
          model: "deepseek-flash",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/settings\/media\/vision$/);
    expect(JSON.parse(String(init.body))).toMatchObject({ mode: "sin_descripcion", provider: "deepseek" });
  });

  it("una acción desconocida no llega a la API", async () => {
    const res = await PUT(
      new Request("http://panel.test/api/settings/media", {
        method: "PUT",
        body: JSON.stringify({ action: "otro" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prueba audio contra el endpoint correcto", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const res = await POST(
      new Request("http://panel.test/api/settings/media/test", {
        method: "POST",
        body: JSON.stringify({ kind: "audio", provider: "groq", model: "whisper-large-v3-turbo" }),
      }),
    );
    expect(res.status).toBe(200);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/settings\/media\/audio\/test$/);
  });

  it("rechaza un tipo de prueba inválido", async () => {
    const res = await POST(
      new Request("http://panel.test/api/settings/media/test", {
        method: "POST",
        body: JSON.stringify({ kind: "otro" }),
      }),
    );
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("conserva el error de la API", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "vision_sin_llave", message: "Falta la llave." } }), { status: 422 }),
    );
    const res = await POST(
      new Request("http://panel.test/api/settings/media/test", {
        method: "POST",
        body: JSON.stringify({ kind: "vision", provider: "deepseek" }),
      }),
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Falta la llave." });
  });
});
