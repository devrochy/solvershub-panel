import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del alta de Instagram (HU-CHAN-04): solo las acciones conocidas, solo sus campos, y el negocio
// activo viaja como X-Tenant-Id.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { GET as DIAG_GET, POST as DIAG_POST } from "@/app/api/meta/instagram/accounts/[igUserId]/diagnostic/route";
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

describe("BFF de Instagram Login", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("login_start no manda cuerpo y devuelve la dirección de Instagram", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ url: "https://www.instagram.com/oauth/authorize?x=1", expires_in: 900 }), { status: 201 }));
    const res = await POST(pedir({ action: "login_start" }));
    expect((await res.json()).url).toMatch(/instagram\.com/);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/instagram\/login\/start$/);
    expect(init.body).toBeUndefined();
  });

  it("login_complete reenvía solo code y state", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ig_user_id: "1" }), { status: 200 }));
    await POST(pedir({ action: "login_complete", code: "abc", state: "xyz", tenant_id: "otro", extra: 1 }));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/instagram\/login\/complete$/);
    expect(JSON.parse(String(init.body))).toEqual({ code: "abc", state: "xyz" });
  });
});

describe("BFF de la prueba de humo", () => {
  const fetchMock = vi.fn();
  const ctx = (igUserId: string) => ({ params: Promise.resolve({ igUserId }) });
  const get = (since: string) => new Request(`http://panel.test/x?since=${encodeURIComponent(since)}`);

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("empieza la prueba y consulta con la fecha del servidor, con el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ since: "2026-10-24T12:00:00Z", wait_seconds: 90 }), { status: 200 }));
    const inicio = await DIAG_POST(new Request("http://panel.test/x", { method: "POST" }), ctx("17841400000"));
    expect((await inicio.json()).wait_seconds).toBe(90);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/accounts\/17841400000\/diagnostic$/);
    expect((init.headers as Record<string, string>)["X-Tenant-Id"]).toBe("t-1");

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ arrived: true }), { status: 200 }));
    await DIAG_GET(get("2026-10-24T12:00:00.123456+00:00"), ctx("17841400000"));
    expect(fetchMock.mock.calls[1][0]).toContain("since=2026-10-24T12%3A00%3A00.123456%2B00%3A00");
  });

  it("un ID o una fecha con formato raro no llegan a la API", async () => {
    for (const malo of ["abc", "123/../x", "12 34", "1".repeat(40), "١٢٣"]) {
      expect((await DIAG_POST(new Request("http://panel.test/x", { method: "POST" }), ctx(malo))).status).toBe(400);
      expect((await DIAG_GET(get("2026-10-24T12:00:00Z"), ctx(malo))).status).toBe(400);
    }
    for (const mala of ["", "ayer", "2026-10-24", "2026-10-24T12:00:00Z&admin=1", "../x"]) {
      expect((await DIAG_GET(get(mala), ctx("123"))).status).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
