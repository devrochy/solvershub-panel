import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de datos del cliente por agente (HU-CRM-28): solo niveles conocidos llegan a la API.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { PUT } from "@/app/api/agent-editor/[id]/datos-cliente/route";

const AGENTE = "11111111-1111-1111-1111-111111111111";
const ctx = { params: Promise.resolve({ id: AGENTE }) };
const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "PUT", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });

describe("BFF de datos del cliente por agente", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reenvía la política al agente con el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ agente_id: AGENTE, niveles: [], acciones: [] }), { status: 200 }));
    const res = await PUT(
      cuerpo({ politica: { "ventas.crear_pedido": { nombre: "no_pedir" }, "agenda.agendar_cita": {} } }),
      ctx,
    );
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${AGENTE}/datos-cliente$`));
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("X-Tenant-Id")).toBe("t-1");
    expect(JSON.parse(init.body as string)).toEqual({
      politica: { "ventas.crear_pedido": { nombre: "no_pedir" }, "agenda.agendar_cita": {} },
    });
  });

  it("rechaza cuerpos mal formados o niveles desconocidos sin llamar a la API", async () => {
    expect((await PUT(cuerpo({ nada: true }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ politica: [] }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ politica: { a: { b: "obligatorio" } } }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ politica: { a: "requerido" } }), ctx)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve el error de la API con su estado", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "x", message: "Ese dato no se puede ajustar." } }), { status: 422 }),
    );
    const res = await PUT(cuerpo({ politica: { a: { b: "requerido" } } }), ctx);
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toContain("no se puede ajustar");
  });
});
