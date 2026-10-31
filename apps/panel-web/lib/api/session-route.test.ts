import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Cookies del BFF en memoria (las de `next/headers`).
const jar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (jar.has(nombre) ? { name: nombre, value: jar.get(nombre) } : undefined),
    set: (nombre: string, valor: string) => {
      jar.set(nombre, valor);
    },
    delete: (nombre: string) => {
      jar.delete(nombre);
    },
  }),
}));

import { GET } from "@/app/api/session/route";
import { GET as RESET } from "@/app/api/tenant/reset/route";
import { GET as CERRAR } from "@/app/api/session/cerrar/route";

const ME = { admin_id: "a", email: "x@test", role: "owner", tenant: { id: "t-2", name: "Sur", role: "owner", active: true }, permissions: { dashboard: "write" } };

function tenantEnviado(init: RequestInit | undefined): string | undefined {
  return (init?.headers as Record<string, string> | undefined)?.["X-Tenant-Id"];
}

describe("GET /api/session (sesión vigente)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    jar.clear();
    jar.set("panel_session", "token");
    jar.set("panel_tenant", "t-1");
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("devuelve lo que la API dice ahora, con el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(ME), { status: 200 }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).permissions).toEqual({ dashboard: "write" });
    expect(tenantEnviado(fetchMock.mock.calls[0][1])).toBe("t-1");
  });

  it("con 401 borra las cookies de sesión y negocio", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "unauthorized", message: "Sesión inválida." } }), { status: 401 }));
    const res = await GET();
    expect(res.status).toBe(401);
    expect(jar.has("panel_session")).toBe(false);
    expect(jar.has("panel_tenant")).toBe(false);
  });

  it("con el negocio suspendido cierra la sesión y devuelve el código", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "tenant_suspended", message: "El negocio está suspendido." } }), { status: 403 }),
    );
    const res = await GET();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "El negocio está suspendido.", code: "tenant_suspended" });
    expect(jar.has("panel_session")).toBe(false);
  });

  it("si el negocio guardado ya no es accesible (desvinculado), lo olvida y reintenta sin él", async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) =>
      tenantEnviado(init)
        ? new Response(JSON.stringify({ error: { code: "forbidden", message: "No tienes acceso a ese negocio." } }), { status: 403 })
        : new Response(JSON.stringify(ME), { status: 200 }),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).tenant.id).toBe("t-2");
    expect(jar.has("panel_tenant")).toBe(false);
    expect(jar.get("panel_session")).toBe("token");
  });

  it("las rutas de salida borran las cookies y redirigen a la URL pública", async () => {
    // Detrás del túnel, Next arma request.url con la dirección interna del contenedor;
    // el navegador tiene que volver por el host que vio el proxy.
    const interno = { "x-forwarded-host": "test.solvershub.site", "x-forwarded-proto": "https" };
    const reset = await RESET(new Request("http://0.0.0.0:3000/api/tenant/reset", { headers: interno }));
    expect(reset.status).toBe(307);
    expect(reset.headers.get("location")).toBe("https://test.solvershub.site/dashboard");
    expect(jar.has("panel_tenant")).toBe(false);
    expect(jar.has("panel_session")).toBe(true);
    const cerrar = await CERRAR(new Request("http://0.0.0.0:3000/api/session/cerrar", { headers: interno }));
    expect(cerrar.headers.get("location")).toBe("https://test.solvershub.site/login");
    expect(jar.has("panel_session")).toBe(false);
  });
});
