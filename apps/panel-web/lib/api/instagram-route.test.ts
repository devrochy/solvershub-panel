import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del alta de Instagram (HU-CHAN-04): solo las acciones conocidas, solo sus campos, y el negocio
// activo viaja como X-Tenant-Id.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { GET, POST } from "@/app/api/meta/instagram/route";

const pedir = (json: unknown) =>
  new Request("http://panel.test/x", { method: "POST", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });

describe("BFF de Instagram", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lee el estado con el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ meta_configured: true }), { status: 200 }));
    const res = await GET();
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/meta\/instagram$/);
    expect((init.headers as Record<string, string>)["X-Tenant-Id"]).toBe("t-1");
  });

  it("una acción desconocida no llega a la API", async () => {
    const res = await POST(pedir({ action: "borrar" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("discover reenvía solo code y attempt", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ connection_id: "c", pages: [] }), { status: 200 }));
    await POST(pedir({ action: "discover", code: "abc", attempt: "xyz", tenant_id: "otro" }));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/instagram\/discover$/);
    expect(JSON.parse(String(init.body))).toEqual({ code: "abc", attempt: "xyz" });
  });

  it("connect reenvía la conexión y las cuentas elegidas", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ connected: [], skipped: [] }), { status: 200 }));
    await POST(pedir({ action: "connect", connection_id: "c", ig_user_ids: ["1"], extra: 1 }));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/instagram\/connect$/);
    expect(JSON.parse(String(init.body))).toEqual({ connection_id: "c", ig_user_ids: ["1"] });
  });

  it("attempt no manda cuerpo y devuelve el intento", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ attempt: "a", expires_in: 900 }), { status: 201 }));
    const res = await POST(pedir({ action: "attempt" }));
    expect(await res.json()).toEqual({ attempt: "a", expires_in: 900 });
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].body).toBeUndefined();
  });

  it("un error de la API llega con su estado y su mensaje", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "forbidden", message: "Solo el propietario." } }), { status: 403 }),
    );
    const res = await POST(pedir({ action: "attempt" }));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Solo el propietario.");
  });
});
