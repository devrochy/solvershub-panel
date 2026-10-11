import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const jar = new Map<string, string>([
  ["panel_session", "sesion"],
  ["panel_tenant", "t-1"],
]);
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (jar.has(nombre) ? { name: nombre, value: jar.get(nombre) } : undefined),
  }),
}));

import { GET } from "@/app/api/buscar/route";

describe("BFF de la búsqueda de la paleta (HU-DS-05)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("reenvía la consulta con la sesión y el negocio, y omite las secciones vacías", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          resultados: [
            { seccion: "conversations", label: "Conversaciones", items: [] },
            {
              seccion: "pack_cobranza:clientes",
              label: "Clientes de cobranza",
              items: [{ id: "k1", tipo: "cliente_cobranza", titulo: "Ana Pérez", subtitulo: "CC 123", extra: {} }],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const res = await GET(new Request("http://panel.test/api/buscar?q=Ana%20P"));

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/search\?q=Ana%20P&limit=5$/);
    expect(init.headers).toMatchObject({ Authorization: "Bearer sesion", "X-Tenant-Id": "t-1" });
    expect(await res.json()).toEqual({
      resultados: [
        {
          seccion: "pack_cobranza:clientes",
          label: "Clientes de cobranza",
          items: [{ id: "k1", tipo: "cliente_cobranza", titulo: "Ana Pérez", subtitulo: "CC 123", extra: {} }],
        },
      ],
    });
  });

  it("no llama al backend con menos de 2 caracteres", async () => {
    const res = await GET(new Request("http://panel.test/api/buscar?q=a"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propaga el error del backend", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "Selecciona un negocio (X-Tenant-Id)." } }), { status: 400 }),
    );
    const res = await GET(new Request("http://panel.test/api/buscar?q=ana"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Selecciona un negocio (X-Tenant-Id)." });
  });
});
