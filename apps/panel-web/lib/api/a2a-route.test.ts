import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de colaboración (HU-AOS-26): solo pares con ids válidos y modos conocidos llegan a la API, y
// «Probar una frase» reenvía la conexión y el texto, nada más.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { PUT } from "@/app/api/a2a/graph/route";
import { POST } from "@/app/api/a2a/route-preview/route";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const cuerpo = (json: unknown, method = "PUT") =>
  new Request("http://panel.test/x", { method, body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });

describe("BFF de colaboración", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("publica los permisos con el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ version: null, links: [], warnings: [], created: true }), { status: 200 }));
    const res = await PUT(cuerpo({ links: [{ from_agent_id: A, to_agent_id: B, modes: ["handoff"] }] }));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/a2a\/graph$/);
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("X-Tenant-Id")).toBe("t-1");
  });

  it("rechaza modos internos o ids que no son uuid sin llamar a la API", async () => {
    expect((await PUT(cuerpo({ links: [{ from_agent_id: A, to_agent_id: B, modes: ["broadcast"] }] }))).status).toBe(400);
    expect((await PUT(cuerpo({ links: [{ from_agent_id: "x", to_agent_id: B, modes: ["query"] }] }))).status).toBe(400);
    expect((await PUT(cuerpo({ nada: true }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve el código de la API para mostrar un mensaje claro", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "aos_runtime_legacy", message: "No." } }), { status: 403 }),
    );
    const res = await PUT(cuerpo({ links: [] }));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("aos_runtime_legacy");
  });

  it("probar una frase reenvía solo la conexión y el texto", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ mode: "off" }), { status: 200 }));
    const res = await POST(cuerpo({ connection_id: A, text: "  quiero una demo ", tenant_id: "otro" }, "POST"));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/admin\/a2a\/route-preview$/);
    expect(JSON.parse(String(init.body))).toEqual({ connection_id: A, text: "quiero una demo" });
    expect((await POST(cuerpo({ connection_id: A, text: "" }, "POST"))).status).toBe(400);
  });
});
