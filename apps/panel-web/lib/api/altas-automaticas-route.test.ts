import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));

import { POST } from "@/app/api/platform/altas-automaticas/[vendedor]/route";

const VENDEDOR = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";

function pedido(vendedor: string, body: unknown): [Request, { params: Promise<{ vendedor: string }> }] {
  return [
    new Request(`http://panel.test/api/platform/altas-automaticas/${vendedor}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ vendedor }) },
  ];
}

describe("BFF del alta automática (HU-SH-07)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("pausa con PUT al interruptor y solo manda los campos del contrato", async () => {
    const res = await POST(...pedido(VENDEDOR, { action: "interruptor", pausado: true, motivo: "ataque", extra: 1 }));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/admin/platform/altas-automaticas/${VENDEDOR}/interruptor$`));
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ pausado: true, motivo: "ataque" });
  });

  it("aprueba un alta por su referencia", async () => {
    await POST(...pedido(VENDEDOR, { action: "aprobar", referencia: "SH-0012" }));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/altas\/SH-0012\/aprobar$/);
    expect(init.method).toBe("POST");
  });

  it("rechaza un vendedor que no es un UUID, una referencia con barras y una acción desconocida", async () => {
    expect((await POST(...pedido("../tenants", { action: "aprobar", referencia: "SH-1" }))).status).toBe(400);
    expect((await POST(...pedido(VENDEDOR, { action: "aprobar", referencia: "../../x" }))).status).toBe(400);
    expect((await POST(...pedido(VENDEDOR, { action: "purge" }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve el error del core con su estado", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "alta_no_revisable", message: "El alta está completado." } }), {
        status: 409,
      }),
    );
    const res = await POST(...pedido(VENDEDOR, { action: "descartar", referencia: "SH-1", motivo: "prueba" }));
    expect(res.status).toBe(409);
  });
});
