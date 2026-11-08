import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del agente (HU-AOS-24 + archivar): nombre y descripción, o el estado por separado. Solo se reenvían
// los campos permitidos y los 409 de la API (`agent_reserved`, `agent_in_use`) llegan con su código.

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (nombre === "panel_session" ? { value: "token-de-prueba" } : undefined) }),
}));

import { PATCH } from "@/app/api/agent-editor/[id]/route";

const AGENTE = "11111111-1111-4111-8111-111111111111";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const pedido = (body: unknown) =>
  new Request("http://panel.test/x", { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("BFF PATCH del agente", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("archivar reenvía solo el estado", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: "archived" }), { status: 200 }));
    const res = await PATCH(pedido({ status: "archived", name: "otro", key: "general" }), ctx(AGENTE));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${AGENTE}$`));
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ status: "archived" });
  });

  it("un estado desconocido o un id inválido no llegan a la API", async () => {
    expect((await PATCH(pedido({ status: "deleted" }), ctx(AGENTE))).status).toBe(400);
    expect((await PATCH(pedido({ status: "archived" }), ctx("../x"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el 409 de la API llega con su código", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "agent_in_use", message: "Está en una conexión." } }), { status: 409 }),
    );
    const res = await PATCH(pedido({ status: "archived" }), ctx(AGENTE));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "agent_in_use", error: "Está en una conexión." });
  });

  it("nombre y descripción siguen como antes", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await PATCH(pedido({ name: "  Ventas  ", description: "Vende" }), ctx(AGENTE));
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      name: "Ventas",
      description: "Vende",
    });
  });
});
