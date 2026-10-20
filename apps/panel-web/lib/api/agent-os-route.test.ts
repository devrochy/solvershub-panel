import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del Agent OS del negocio (HU-AOS-15): id validado, solo los campos conocidos y los bloqueos
// del 409 (`details`) llegan al panel.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { GET, POST, PUT } from "@/app/api/platform/tenants/[id]/agent-os/route";

const NEGOCIO = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const ctx = (id = NEGOCIO) => ({ params: Promise.resolve({ id }) });
const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "PUT", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });

describe("BFF del Agent OS", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    cookies.set("panel_tenant", "t-1");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lee el estado del negocio de la ruta", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ runtime: "legacy" }), { status: 200 }));
    const res = await GET(new Request("http://panel.test/x"), ctx());
    expect(res.status).toBe(200);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/platform/tenants/${NEGOCIO}/agent-os$`));
  });

  it("un id que no es uuid no llega a la API", async () => {
    expect((await GET(new Request("http://panel.test/x"), ctx("../admin"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("simular reenvía solo los campos conocidos por POST", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ accion: "listo" }), { status: 200 }));
    const res = await POST(cuerpo({ runtime: "v3", procedures: false, routing: "off", tenant_id: "otro" }), ctx());
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/agent-os\/simular$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ runtime: "v3", procedures: false, routing: "off", construir: false });
  });

  it("un estado inválido no llega a la API", async () => {
    expect((await PUT(cuerpo({ runtime: "v3", procedures: "si", routing: "off" }), ctx())).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("aplicar devuelve los bloqueos del 409 y no manda el negocio activo si es el mismo", async () => {
    cookies.set("panel_tenant", NEGOCIO);
    const details = { accion: "bloqueado", bloqueos: ["AOS_CONNECTION_ROUTING está apagada"], avisos: [], pasos: [] };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "agent_os_bloqueado", message: "No está listo.", details } }), {
        status: 409,
      }),
    );
    const res = await PUT(cuerpo({ runtime: "v3", procedures: false, routing: "off" }), ctx());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "No está listo.", code: "agent_os_bloqueado", details });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("PUT");
    expect(init.headers).not.toHaveProperty("X-Tenant-Id");
  });
});
