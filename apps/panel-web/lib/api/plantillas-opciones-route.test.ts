import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de plantillas con opciones: la ruta sin segmentos (lista y alta) tiene que llegar al backend (SPEC-40, pista B2).
// Era un catch-all `[...ruta]` que exige al menos un segmento: `GET`/`POST /api/plantillas-opciones` daban 404.

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "panel_session" ? { value: "token-de-prueba" } : undefined) }),
}));

import { GET, POST } from "@/app/api/plantillas-opciones/[[...ruta]]/route";

const pedir = (metodo: string, cuerpo?: unknown) =>
  new Request("http://panel.test/api/plantillas-opciones", {
    method: metodo,
    ...(cuerpo === undefined ? {} : { body: JSON.stringify(cuerpo) }),
  });

describe("BFF de plantillas con opciones: ruta sin segmentos", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("GET sin segmentos lista las plantillas del negocio", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ plantillas: [] }), { status: 200 }));
    const res = await GET(pedir("GET"), { params: Promise.resolve({}) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ plantillas: [] });
    expect((fetchMock.mock.calls[0] as [string])[0]).toMatch(/\/api\/v1\/plantillas-opciones$/);
  });

  it("POST sin segmentos crea la plantilla", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ clave: "nueva" }), { status: 201 }));
    const res = await POST(pedir("POST", { clave: "nueva", nombre: "Nueva" }), { params: Promise.resolve({}) });
    expect(res.status).toBe(201);
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({ clave: "nueva", nombre: "Nueva" });
  });

  it("una ruta que no está en la lista cerrada sigue en 404 sin llegar al backend", async () => {
    const res = await GET(pedir("GET"), { params: Promise.resolve({ ruta: ["../admin", "x"] }) });
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
