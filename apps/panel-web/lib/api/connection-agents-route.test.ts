import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de los agentes de una conexión (HU-UX-09): ids validados, solo los campos que acepta la API
// (`extra="forbid"`) y el `code` estable de los 403/409/422 llega al panel.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { GET, POST } from "@/app/api/connections/[id]/agents/route";
import { DELETE, PATCH } from "@/app/api/connections/[id]/agents/[instanceId]/route";

const C = "00000000-0000-4000-8000-0000000000c1";
const A = "00000000-0000-4000-8000-0000000000e1";
const I = "00000000-0000-4000-8000-0000000000f1";
const ctx = (id = C) => ({ params: Promise.resolve({ id }) });
const ctxI = (instanceId = I, id = C) => ({ params: Promise.resolve({ id, instanceId }) });
const req = (method: string, body?: unknown) =>
  new Request("http://panel.test/x", { method, body: body === undefined ? undefined : JSON.stringify(body) });

describe("BFF de agentes de una conexión", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const llamada = (n = 0) => fetchMock.mock.calls[n] as [string, RequestInit];

  it("lista y asigna con solo los campos permitidos", async () => {
    fetchMock.mockResolvedValue(new Response("[]", { status: 200 }));
    await GET(req("GET"), ctx());
    expect(llamada()[0]).toMatch(new RegExp(`/admin/connections/${C}/agents$`));
    fetchMock.mockResolvedValue(new Response("{}", { status: 201 }));
    const res = await POST(req("POST", { agent_id: A, priority: 50, tenant_id: "otro", role: "core" }), ctx());
    expect(res.status).toBe(201);
    expect(llamada(1)[1].method).toBe("POST");
    expect(JSON.parse(String(llamada(1)[1].body))).toEqual({ agent_id: A, priority: 50 });
  });

  it("cambia y quita una instancia; `is_default` solo viaja como true", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await PATCH(req("PATCH", { is_default: true, enabled: true, agent_id: A }), ctxI());
    expect(llamada()[0]).toMatch(new RegExp(`/admin/connections/${C}/agents/${I}$`));
    expect(JSON.parse(String(llamada()[1].body))).toEqual({ enabled: true, is_default: true });
    expect((await PATCH(req("PATCH", { is_default: false }), ctxI())).status).toBe(400);
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    expect((await DELETE(req("DELETE"), ctxI())).status).toBe(204);
    expect(llamada(1)[1].method).toBe("DELETE");
  });

  it("rechaza ids o cuerpos inválidos sin llamar a la API", async () => {
    expect((await GET(req("GET"), ctx("../x"))).status).toBe(400);
    expect((await POST(req("POST", { agent_id: "no-uuid" }), ctx())).status).toBe(400);
    expect((await PATCH(req("PATCH", { enabled: true }), ctxI("../y"))).status).toBe(400);
    expect((await DELETE(req("DELETE"), ctxI(I, "x"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el 403 del runtime legacy llega con su code", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "aos_runtime_legacy", message: "x" } }), { status: 403 }),
    );
    const res = await POST(req("POST", { agent_id: A }), ctx());
    expect(res.status).toBe(403);
    expect(await res.json()).toMatchObject({ code: "aos_runtime_legacy" });
  });
});
