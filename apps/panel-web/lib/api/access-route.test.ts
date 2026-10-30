import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de Seguridad (HU-ACC-04): solo acciones conocidas llegan a la API, con el negocio activo,
// y los errores conservan `code` y `details` (el panel los usa para el 409).

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { POST as accion } from "@/app/api/access/devices/[id]/[accion]/route";
import { GET as listar, POST as alta } from "@/app/api/access/devices/route";
import { GET as eventos } from "@/app/api/access/events/route";
import { PUT as politica } from "@/app/api/access/policy/route";

const ID = "3f1c2b4e-7a9d-4c1e-8b2a-5d6e7f8a9b0c";
const cuerpo = (json: unknown, method = "POST") =>
  new Request("http://panel.test/x", { method, body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });
const ctx = (accionRuta: string, id = ID) => ({ params: Promise.resolve({ id, accion: accionRuta }) });

describe("BFF de Seguridad", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("aprueba con el estado esperado y el negocio activo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID }), { status: 200 }));
    const res = await accion(cuerpo({ esperado: "pendiente" }), ctx("aprobar"));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/access/devices/${ID}/aprobar$`));
    expect(new Headers(init.headers).get("X-Tenant-Id")).toBe("t-1");
    expect(JSON.parse(init.body as string)).toEqual({ esperado: "pendiente" });
  });

  it("bloquear lleva alcance y motivo; dar de baja responde 204", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID }), { status: 200 }));
    await accion(cuerpo({ esperado: "activo", alcance: "equipo", motivo: " perdido ", extra: 1 }), ctx("bloquear"));
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual({
      esperado: "activo",
      alcance: "equipo",
      motivo: "perdido",
    });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const baja = await accion(cuerpo({ esperado: "activo" }), ctx("dar-de-baja"));
    expect(baja.status).toBe(204);
  });

  it("rechaza acciones, ids o estados inválidos sin llamar a la API", async () => {
    expect((await accion(cuerpo({ esperado: "activo" }), ctx("borrar"))).status).toBe(400);
    expect((await accion(cuerpo({ esperado: "activo" }), ctx("aprobar", "no-es-uuid"))).status).toBe(400);
    expect((await accion(cuerpo({ esperado: "raro" }), ctx("aprobar"))).status).toBe(400);
    expect((await accion(cuerpo({}), ctx("aprobar"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("conserva code y details del 409 de la API", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "dueno_sin_equipo", message: "Quedaría sin equipo.", details: { cuentas: [{ id: "1", email: "a@x.co" }] } } }),
        { status: 409 },
      ),
    );
    const res = await politica(cuerpo({ owner: "restringido" }, "PUT"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Quedaría sin equipo.",
      code: "dueno_sin_equipo",
      details: { cuentas: [{ id: "1", email: "a@x.co" }] },
    });
  });

  it("la política solo acepta valores conocidos y manda confirmar", async () => {
    expect((await politica(cuerpo({ owner: "libre" }, "PUT"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ owner: "abierto" }), { status: 200 }));
    await politica(cuerpo({ gestor: "abierto", confirmar: true, otro: "x" }, "PUT"));
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual({
      gestor: "abierto",
      confirmar: true,
    });
  });

  it("el alta manual exige cuenta e identificador", async () => {
    expect((await alta(cuerpo({ device_id: "abc" }))).status).toBe(400);
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID }), { status: 200 }));
    await alta(cuerpo({ admin_id: "a", device_id: "abcd", label: "  ", plataforma: "otra" }));
    expect(JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string)).toEqual({
      admin_id: "a",
      device_id: "abcd",
      label: null,
      plataforma: "android",
    });
  });

  it("las listas solo reenvían filtros conocidos", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], next_cursor: null }), { status: 200 }));
    await listar(new Request("http://panel.test/api/access/devices?estado=activo&cursor=c1&evil=1"));
    expect((fetchMock.mock.calls[0] as [string])[0]).toMatch(/\/access\/devices\?estado=activo&cursor=c1$/);
    await eventos(new Request("http://panel.test/api/access/events?severidad=critico&admin_id=a&x=1"));
    expect((fetchMock.mock.calls[1] as [string])[0]).toMatch(/\/access\/events\?severidad=critico&admin_id=a$/);
  });
});
