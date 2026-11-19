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

  // HU-AOS-85: antes el BFF descartaba los métodos de entrega y «A domicilio» volvía a encenderse.
  it("reenvía metodos_entrega junto con la política y las herramientas", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ agente_id: AGENTE, niveles: [], acciones: [] }), { status: 200 }));
    const res = await PUT(
      cuerpo({ politica: {}, herramientas_del_agente: true, metodos_entrega: ["recoger_en_tienda"] }),
      ctx,
    );
    expect(res.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({
      politica: {},
      herramientas_del_agente: true,
      metodos_entrega: ["recoger_en_tienda"],
    });
  });

  it("un cuerpo solo con metodos_entrega también es válido", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ agente_id: AGENTE, niveles: [], acciones: [] }), { status: 200 }));
    const res = await PUT(cuerpo({ metodos_entrega: ["domicilio", "recoger_en_tienda"] }), ctx);
    expect(res.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ metodos_entrega: ["domicilio", "recoger_en_tienda"] });
  });

  it("rechaza métodos desconocidos o mal formados sin llamar a la API", async () => {
    expect((await PUT(cuerpo({ metodos_entrega: ["a_domicilio"] }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ metodos_entrega: "domicilio" }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ metodos_entrega: [1] }), ctx)).status).toBe(400);
    expect((await PUT(cuerpo({ metodos_entrega: null }), ctx)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("una lista vacía llega al backend y su 422 metodos_entrega_vacios pasa tal cual", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "metodos_entrega_vacios", message: "Deja al menos un método de entrega." } }),
        { status: 422 },
      ),
    );
    const res = await PUT(cuerpo({ metodos_entrega: [] }), ctx);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ metodos_entrega: [] });
    expect(res.status).toBe(422);
    const json = (await res.json()) as { error: string; code?: string };
    expect(json.code).toBe("metodos_entrega_vacios");
    expect(json.error).toContain("al menos un método");
  });
});
