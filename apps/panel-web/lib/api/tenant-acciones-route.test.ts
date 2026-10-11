import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TENANT = "5a0c9a39-2a4e-4f55-9a43-6f4f1c6c2b01";
const OTRO = "9d1e1a5b-7c1f-4a51-8f0e-2b7d6f1e3c02";
let negocioActivo: string | undefined;

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "panel_tenant" && negocioActivo ? { name, value: negocioActivo } : undefined,
    set: () => undefined,
    delete: () => undefined,
  }),
}));

import { POST } from "@/app/api/platform/tenants/[id]/route";
import { MENSAJE_NO_SUSPENDIDO } from "@/lib/eliminar-negocio";

function pedido(id: string, body: unknown): [Request, { params: Promise<{ id: string }> }] {
  return [
    new Request(`http://panel.test/api/platform/tenants/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  ];
}

function headers(): Record<string, string> {
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  return init.headers as Record<string, string>;
}

const fetchMock = vi.fn();

describe("BFF de acciones de un negocio (master)", () => {
  beforeEach(() => {
    negocioActivo = OTRO;
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("purga con la frase y el negocio activo del panel en X-Tenant-Id", async () => {
    const res = await POST(...pedido(TENANT, { action: "purge", confirm_phrase: "ELIMINAR demo" }));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/platform/tenants/${TENANT}/purge$`));
    expect(JSON.parse(String(init.body))).toEqual({ confirm_phrase: "ELIMINAR demo" });
    expect(headers()["X-Tenant-Id"]).toBe(OTRO);
  });

  it("no manda como X-Tenant-Id el mismo negocio sobre el que actúa (la API rechaza uno suspendido)", async () => {
    negocioActivo = TENANT;
    await POST(...pedido(TENANT, { action: "purge", confirm_phrase: "ELIMINAR demo" }));
    expect(headers()).not.toHaveProperty("X-Tenant-Id");
  });

  it("muestra un mensaje claro con el 409 tenant_not_suspended", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "tenant_not_suspended",
            message: "suspéndelo primero (`agent-core tenant deactivate demo`, o Desactivar en el panel)",
          },
        }),
        { status: 409 },
      ),
    );
    const res = await POST(...pedido(TENANT, { action: "purge", confirm_phrase: "ELIMINAR demo" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: MENSAJE_NO_SUSPENDIDO, code: "tenant_not_suspended" });
  });

  it("deja pasar el mensaje del core en los demás errores", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "purge_confirmation", message: "Frase incorrecta." } }), {
        status: 400,
      }),
    );
    const res = await POST(...pedido(TENANT, { action: "purge", confirm_phrase: "x" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Frase incorrecta.", code: "purge_confirmation" });
  });

  it("rechaza una acción desconocida sin llamar a la API", async () => {
    const res = await POST(...pedido(TENANT, { action: "borrar" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
