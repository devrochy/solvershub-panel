import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Cookies del BFF en memoria (las de `next/headers`).
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (jar.has(nombre) ? { name: nombre, value: jar.get(nombre) } : undefined),
    set: (nombre: string, valor: string) => {
      jar.set(nombre, valor);
    },
    delete: (nombre: string) => {
      jar.delete(nombre);
    },
  }),
}));

import { POST } from "@/app/api/invitacion/route";

function pedido(): Request {
  return new Request("http://panel.test/api/invitacion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "t", password: "clave-larga-1" }),
  });
}

describe("BFF del canje de la invitación (HU-SH-06)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    jar.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("cierra la sesión anterior del navegador antes de guardar la nueva", async () => {
    jar.set("panel_session", "sesion-vieja");
    fetchMock.mockImplementation(async (url: string) =>
      url.endsWith("/auth/accept-invitation")
        ? new Response(
            JSON.stringify({ token: "sesion-nueva", admin_id: "a", tenant_id: "t-1", expires_in: 60 }),
            { status: 200 },
          )
        : new Response(null, { status: 204 }),
    );

    const res = await POST(pedido());

    expect(res.status).toBe(200);
    const logout = fetchMock.mock.calls.find(([url]) => String(url).endsWith("/auth/logout"));
    expect(logout?.[1]?.headers).toEqual({ Authorization: "Bearer sesion-vieja" });
    expect(jar.get("panel_session")).toBe("sesion-nueva");
    expect(jar.get("panel_tenant")).toBe("t-1");
  });

  it("si el canje falla no toca la sesión que había", async () => {
    jar.set("panel_session", "sesion-vieja");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "invalid_token" } }), { status: 400 }));

    const res = await POST(pedido());

    expect(res.status).toBe(400);
    expect((await res.json()).resultado).toBe("enlace_invalido");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(jar.get("panel_session")).toBe("sesion-vieja");
  });
});
