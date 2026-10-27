import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de la bandera de plantillas con opciones (SPEC-40, PR 10b): id validado, solo `{habilitada}` llega
// a la API y los 403/404 de la ruta solo-master pasan con su estado.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { GET, PUT } from "@/app/api/platform/tenants/[id]/opciones-directas/route";

const NEGOCIO = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const ctx = (id = NEGOCIO) => ({ params: Promise.resolve({ id }) });
const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "PUT", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });
const errorApi = (status: number, code: string) =>
  new Response(JSON.stringify({ error: { code, message: "Mensaje de la API." } }), { status });

describe("BFF de plantillas con opciones por negocio", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    cookies.set("panel_tenant", "t-1");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lee la bandera del negocio de la ruta con la sesión del master", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ habilitada: false }), { status: 200 }));
    const res = await GET(new Request("http://panel.test/x"), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ habilitada: false });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/platform/tenants/${NEGOCIO}/opciones-directas$`));
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token-de-prueba");
  });

  it("un id que no es uuid no llega a la API", async () => {
    expect((await GET(new Request("http://panel.test/x"), ctx("../admin"))).status).toBe(400);
    expect((await PUT(cuerpo({ habilitada: true }), ctx("../admin"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("encender reenvía solo {habilitada} por PUT", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ habilitada: true }), { status: 200 }));
    const res = await PUT(cuerpo({ habilitada: true }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ habilitada: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/opciones-directas$/);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ habilitada: true });
  });

  it("repetir el mismo valor devuelve el mismo estado (idempotente)", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ habilitada: false }), { status: 200 }));
    const a = await (await PUT(cuerpo({ habilitada: false }), ctx())).json();
    const b = await (await PUT(cuerpo({ habilitada: false }), ctx())).json();
    expect(a).toEqual(b);
  });

  it("un cuerpo inválido o con campos de más no llega a la API", async () => {
    expect((await PUT(cuerpo({ habilitada: "si" }), ctx())).status).toBe(400);
    expect((await PUT(cuerpo({ habilitada: true, tenant_id: "otro" }), ctx())).status).toBe(400);
    expect((await PUT(new Request("http://panel.test/x", { method: "PUT", body: "no es json" }), ctx())).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("403 (no es master) y 404 (negocio inexistente) pasan con su estado y su código", async () => {
    fetchMock.mockResolvedValueOnce(errorApi(403, "forbidden"));
    const prohibido = await PUT(cuerpo({ habilitada: true }), ctx());
    expect(prohibido.status).toBe(403);
    expect(await prohibido.json()).toEqual({ error: "Mensaje de la API.", code: "forbidden" });

    fetchMock.mockResolvedValueOnce(errorApi(404, "not_found"));
    const inexistente = await GET(new Request("http://panel.test/x"), ctx());
    expect(inexistente.status).toBe(404);
  });

  it("si la API no responde, el BFF devuelve 502", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const res = await PUT(cuerpo({ habilitada: true }), ctx());
    expect(res.status).toBe(502);
  });

  it("no manda el negocio activo si es el mismo sobre el que se actúa", async () => {
    cookies.set("panel_tenant", NEGOCIO);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ habilitada: true }), { status: 200 }));
    await PUT(cuerpo({ habilitada: true }), ctx());
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.headers).not.toHaveProperty("X-Tenant-Id");
  });
});
