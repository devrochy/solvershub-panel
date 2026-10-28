import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de datos del cliente (HU-CRM-13): solo niveles conocidos llegan a la API, con el negocio activo.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { PUT } from "@/app/api/datos-cliente/politica/route";

const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "PUT", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });

describe("BFF de datos del cliente", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reenvía la política con el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ niveles: [], acciones: [] }), { status: 200 }));
    const res = await PUT(cuerpo({ politica: { "ventas.crear_pedido": { nombre: "no_pedir" }, "agenda.agendar_cita": {} } }));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/datos-cliente\/politica$/);
    expect(init.method).toBe("PUT");
    expect(new Headers(init.headers).get("X-Tenant-Id")).toBe("t-1");
    expect(JSON.parse(init.body as string)).toEqual({
      politica: { "ventas.crear_pedido": { nombre: "no_pedir" }, "agenda.agendar_cita": {} },
    });
  });

  it("rechaza cuerpos mal formados o niveles desconocidos sin llamar a la API", async () => {
    expect((await PUT(cuerpo({ nada: true }))).status).toBe(400);
    expect((await PUT(cuerpo({ politica: [] }))).status).toBe(400);
    expect((await PUT(cuerpo({ politica: { a: { b: "obligatorio" } } }))).status).toBe(400);
    expect((await PUT(cuerpo({ politica: { a: "requerido" } }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve el error de la API con su estado", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "x", message: "Ese dato no se puede ajustar." } }), { status: 422 }));
    const res = await PUT(cuerpo({ politica: { a: { b: "requerido" } } }));
    expect(res.status).toBe(422);
    expect(((await res.json()) as { error: string }).error).toContain("no se puede ajustar");
  });
});
