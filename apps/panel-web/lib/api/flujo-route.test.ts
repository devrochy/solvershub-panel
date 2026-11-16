import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del flujo de atención por agente (ADR-0195, HU-AOS-74/78): el editor lo llama al guardar.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { PUT } from "@/app/api/agent-editor/[id]/flow/route";

const AGENTE = "11111111-1111-1111-1111-111111111111";
const ctx = { params: Promise.resolve({ id: AGENTE }) };
const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "PUT", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });
const FLUJO = { sections: [{ id: "saludo", label: "Saludo", purpose: "Saluda.", tools: [] }] };

describe("BFF del flujo del agente", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reenvía el flujo con el lock_version y el negocio activo, y devuelve el lock_version nuevo", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ flow: FLUJO, lock_version: 8, source: "agente", seeded: false, warnings: [] }), { status: 200 }),
    );
    const res = await PUT(cuerpo({ flow: FLUJO, lock_version: 7 }), ctx);
    expect(res.status).toBe(200);
    expect(((await res.json()) as { lock_version: number }).lock_version).toBe(8);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${AGENTE}/flow$`));
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("X-Tenant-Id")).toBe("t-1");
    expect(JSON.parse(init.body as string)).toEqual({ flow: FLUJO, lock_version: 7 });
  });

  it("rechaza cuerpos mal formados sin llamar a la API", async () => {
    expect((await PUT(cuerpo({ flow: FLUJO }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ flow: [], lock_version: 1 }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ lock_version: 1 }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ flow: FLUJO, lock_version: 1 }), { params: Promise.resolve({ id: "x" }) })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve los errores por campo de la API", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "invalid_flow", message: "Revisa el flujo.", fields: { "flow.sections[0].tools[0]": "Esa acción no está." } } }),
        { status: 422 },
      ),
    );
    const res = await PUT(cuerpo({ flow: FLUJO, lock_version: 1 }), ctx);
    expect(res.status).toBe(422);
    const json = (await res.json()) as { fields?: Record<string, string> };
    expect(json.fields).toEqual({ "flow.sections[0].tools[0]": "Esa acción no está." });
  });
});
