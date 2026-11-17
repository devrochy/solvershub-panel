import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de la pausa por agente (HU-ARCH-38): pause y resume reenvían a la API sin otros campos, y el 409
// (`agent_reserved`) llega con su código.

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (nombre === "panel_session" ? { value: "token-de-prueba" } : undefined) }),
}));

import { POST as pausar } from "@/app/api/agent-editor/[id]/pause/route";
import { POST as reanudar } from "@/app/api/agent-editor/[id]/resume/route";

const AGENTE = "11111111-1111-4111-8111-111111111111";
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const pedido = (body: unknown) =>
  new Request("http://panel.test/x", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("BFF de la pausa por agente", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("pausar reenvía solo el motivo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ paused: true }), { status: 200 }));
    const res = await pausar(pedido({ reason: " responde mal ", status: "archived" }), ctx(AGENTE));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${AGENTE}/pause$`));
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ reason: "responde mal" });
  });

  it("reanudar llama a resume", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ paused: false }), { status: 200 }));
    expect((await reanudar(pedido({}), ctx(AGENTE))).status).toBe(200);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${AGENTE}/resume$`));
  });

  it("un id inválido no llega a la API y el 409 llega con su código", async () => {
    expect((await pausar(pedido({}), ctx("../x"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "agent_reserved", message: "No se pausa." } }), { status: 409 }),
    );
    const res = await pausar(pedido({}), ctx(AGENTE));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { code?: string }).code).toBe("agent_reserved");
  });
});
