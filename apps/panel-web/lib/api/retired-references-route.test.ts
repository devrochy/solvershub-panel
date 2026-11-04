import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del aviso de referencias retiradas (HU-AOS-59): solo GET, id validado, el negocio del dueño sale de la
// sesión (nunca de un parámetro) y el del master viaja en la ruta.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { GET as agente } from "@/app/api/agent-editor/[id]/retired-references/route";
import * as rutaAgente from "@/app/api/agent-editor/[id]/retired-references/route";
import { GET as master } from "@/app/api/platform/tenants/[id]/retired-references/route";
import * as rutaMaster from "@/app/api/platform/tenants/[id]/retired-references/route";

const NEGOCIO = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const AGENTE = "11111111-1111-4111-8111-111111111111";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const pedido = () => new Request("http://panel.test/x");

describe("BFF de referencias retiradas", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    cookies.set("panel_tenant", "t-1");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("master: lee el reporte del negocio de la ruta", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ affected: true }), { status: 200 }));
    const res = await master(pedido(), ctx(NEGOCIO));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ affected: true });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/platform/tenants/${NEGOCIO}/retired-references$`));
    expect(init.method).toBe("GET");
  });

  it("master: si el negocio activo es el mismo no manda X-Tenant-Id, y si es otro lo manda", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    cookies.set("panel_tenant", NEGOCIO);
    await master(pedido(), ctx(NEGOCIO));
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty("X-Tenant-Id");
    await master(pedido(), ctx("0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f11"));
    expect((fetchMock.mock.calls[1][1] as RequestInit).headers).toHaveProperty("X-Tenant-Id", NEGOCIO);
  });

  it("master: un id que no es uuid no llega a la API, y un 403 llega como 403", async () => {
    expect((await master(pedido(), ctx("../admin"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "forbidden", message: "Solo master." } }), { status: 403 }),
    );
    const res = await master(pedido(), ctx(NEGOCIO));
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe("Solo master.");
  });

  it("dueño: lee los avisos del agente con el negocio de su sesión", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ agent_id: AGENTE, notices: [] }), { status: 200 }));
    const res = await agente(pedido(), ctx(AGENTE));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${AGENTE}/retired-references$`));
    expect((init.headers as Record<string, string>)["X-Tenant-Id"]).toBe("t-1");
  });

  it("dueño: id inválido no llega a la API y un 404 (agente de otro negocio) llega como 404", async () => {
    expect((await agente(pedido(), ctx("no-uuid"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "not_found", message: "No existe." } }), { status: 404 }));
    expect((await agente(pedido(), ctx(AGENTE))).status).toBe(404);
  });

  it("solo lectura: ninguna de las dos rutas expone otro método que GET", () => {
    for (const ruta of [rutaMaster, rutaAgente]) {
      expect(Object.keys(ruta).filter((k) => /^(POST|PUT|PATCH|DELETE)$/.test(k))).toEqual([]);
    }
  });
});
