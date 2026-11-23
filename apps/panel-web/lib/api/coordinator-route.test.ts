import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de las opciones del Coordinador (HU-AOS-98).

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { PUT } from "@/app/api/coordinator/route";

const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "PUT", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });

describe("BFF del Coordinador", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reenvía lo recibido a /admin/coordinator con el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ nivel_ia: "avanzado" }), { status: 200 }));
    const res = await PUT(cuerpo({ nivel_ia: "avanzado" }));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toContain("/admin/coordinator");
    expect(JSON.parse(String(init.body))).toEqual({ nivel_ia: "avanzado" });
  });

  it("un cuerpo que no es un objeto da 400 sin llamar a la API", async () => {
    const res = await PUT(cuerpo([1, 2]));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("devuelve el error por campo de la API", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "validation_error", message: "Revisa", fields: { "guardrails[0].tool": "x" } } }), { status: 422 }),
    );
    const res = await PUT(cuerpo({ guardrails: [{}] }));
    expect(res.status).toBe(422);
    expect((await res.json()).fields).toEqual({ "guardrails[0].tool": "x" });
  });
});
