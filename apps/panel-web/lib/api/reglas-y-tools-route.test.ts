import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de las reglas y las tools HTTP del agente (HU-AOS-97): el editor los llama al guardar cada sección.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { PUT as putTools } from "@/app/api/agent-editor/[id]/declarative-tools/route";
import { PUT as putReglas } from "@/app/api/agent-editor/[id]/guardrails/route";

const AGENTE = "11111111-1111-1111-1111-111111111111";
const ctx = { params: Promise.resolve({ id: AGENTE }) };
const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "PUT", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });

describe("BFF de reglas y tools HTTP del agente", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reenvía las reglas con el lock_version y el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ guardrails: [], lock_version: 2 }), { status: 200 }));
    const res = await putReglas(cuerpo({ guardrails: [], lock_version: 1, extra: "x" }), ctx);
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${AGENTE}/guardrails$`));
    expect(new Headers(init.headers).get("X-Tenant-Id")).toBe("t-1");
    expect(JSON.parse(init.body as string)).toEqual({ guardrails: [], lock_version: 1 });
  });

  it("reenvía tools y secretos y devuelve los errores por campo", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "invalid_spec", message: "Revisa.", fields: { "declarativeTools[0].headers": "Literal." } } }),
        { status: 422 },
      ),
    );
    const res = await putTools(cuerpo({ tools: [{ name: "x" }], secrets: { tok: "v" }, lock_version: 3 }), ctx);
    expect(res.status).toBe(422);
    expect(((await res.json()) as { fields?: Record<string, string> }).fields).toEqual({ "declarativeTools[0].headers": "Literal." });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${AGENTE}/declarative-tools$`));
    expect(JSON.parse(init.body as string)).toEqual({ tools: [{ name: "x" }], secrets: { tok: "v" }, lock_version: 3 });
  });

  it("rechaza cuerpos mal formados sin llamar a la API", async () => {
    expect((await putReglas(cuerpo({ guardrails: {}, lock_version: 1 }), ctx)).status).toBe(400);
    expect((await putReglas(cuerpo({ guardrails: [] }), ctx)).status).toBe(400);
    expect((await putTools(cuerpo({ tools: [], secrets: { a: 1 }, lock_version: 1 }), ctx)).status).toBe(400);
    expect((await putTools(cuerpo({ tools: [], lock_version: 1 }), { params: Promise.resolve({ id: "x" }) })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
