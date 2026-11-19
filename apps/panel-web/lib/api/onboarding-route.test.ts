import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del recorrido de la bienvenida (HU-UX-25): `avanzar` numera sobre las 5 estaciones y se lo dice al
// servidor con `pasos: 5`, que es como el backend (HU-AOS-84) guarda y traduce lo viejo.

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (nombre === "panel_session" ? { value: "token-de-prueba" } : undefined) }),
}));

import { POST } from "@/app/api/onboarding/[accion]/route";

const ctx = (accion: string) => ({ params: Promise.resolve({ accion }) });
const pedido = (body: unknown) =>
  new Request("http://panel.test/x", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });

describe("BFF del recorrido de la bienvenida", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ estado: "en_curso", paso: 4, total_pasos: 5 }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("avanzar manda el paso con `pasos: 5`", async () => {
    const res = await POST(pedido({ paso: 4 }), ctx("avanzar"));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/onboarding\/avanzar$/);
    expect(JSON.parse(init.body as string)).toEqual({ paso: 4, pasos: 5 });
  });

  it("acepta del 1 al 5 y rechaza lo demás sin llamar a la API", async () => {
    await POST(pedido({ paso: 5 }), ctx("avanzar"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    for (const paso of [0, 6, 2.5, "3"]) expect((await POST(pedido({ paso }), ctx("avanzar"))).status).toBe(400);
    expect((await POST(pedido({}), ctx("borrar"))).status).toBe(400);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("finalizar y omitir se reenvían tal cual", async () => {
    await POST(pedido({}), ctx("finalizar"));
    await POST(pedido({}), ctx("omitir"));
    const urls = fetchMock.mock.calls.map(([u]) => String(u));
    expect(urls[0]).toMatch(/\/admin\/onboarding\/finalizar$/);
    expect(urls[1]).toMatch(/\/admin\/onboarding\/omitir$/);
  });
});
