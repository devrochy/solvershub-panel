import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }),
}));

import { POST as ALTA } from "@/app/api/collaborators/route";
import { POST as ACCION } from "@/app/api/collaborators/[id]/route";
import { GET as NEGOCIOS } from "@/app/api/platform/tenants/route";

const ID = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";

function pedido(url: string, body: unknown): Request {
  return new Request(`http://panel.test${url}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("BFF de colaboradores", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("el alta devuelve el `resultado` de la API (creado o invitado), no un ok a secas", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ resultado: "invitado" }), { status: 200 }));
    const res = await ALTA(pedido("/api/collaborators", { email: "ana@x.test", password: "clave-larga-1" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, resultado: "invitado" });
  });

  it("el alta sin correo o contraseña no llega a la API", async () => {
    const res = await ALTA(pedido("/api/collaborators", { email: "ana@x.test" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("desvincular va a /unlink con el slug del negocio", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await ACCION(pedido(`/api/collaborators/${ID}`, { action: "unlink", tenant: "tienda-norte" }), {
      params: Promise.resolve({ id: ID }),
    });
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/admin/collaborators/${ID}/unlink$`));
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ tenant: "tienda-norte" });
  });

  it("una acción desconocida se rechaza sin llamar a la API", async () => {
    const res = await ACCION(pedido(`/api/collaborators/${ID}`, { action: "purge" }), { params: Promise.resolve({ id: ID }) });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el autocompletado de negocios solo devuelve id, nombre y slug", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [{ id: "t-1", name: "Tienda Norte", slug: "tienda-norte", status: "active", plan_name: "Pro", plan_status: "active", operational: true, created_at: "2026-10-01" }],
          total: 1,
          page: 1,
          page_size: 20,
          has_more: false,
        }),
        { status: 200 },
      ),
    );
    const res = await NEGOCIOS(new Request("http://panel.test/api/platform/tenants?q=norte"));
    expect(await res.json()).toEqual({ items: [{ id: "t-1", name: "Tienda Norte", slug: "tienda-norte" }] });
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/admin\/platform\/tenants\?page_size=20&q=norte$/);
  });
});
