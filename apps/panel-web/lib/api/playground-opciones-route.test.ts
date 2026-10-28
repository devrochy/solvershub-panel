import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de «Probar plantilla con opciones» en el playground (SPEC-40, pista B2): solo `clave`/`payload` (+ conexión)
// llegan al backend, con la sesión y el negocio activo, y los errores del backend pasan con su código y estado.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { POST as OPTIONS_POST } from "@/app/api/playground/options/route";
import { POST as TAP_POST } from "@/app/api/playground/tap/route";

const CONEXION = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "POST", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });
const errorApi = (status: number, code: string, message = "Mensaje de la API.") =>
  new Response(JSON.stringify({ error: { code, message } }), { status });

describe("BFF del playground: enviar una plantilla con opciones", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reenvía solo la clave (y la conexión) a /admin/playground/options con la sesión y el negocio", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ enviado: true, mensajes: [] }), { status: 200 }));
    const res = await OPTIONS_POST(cuerpo({ clave: "ver_mis_citas", connection_id: CONEXION, tenant_id: "otro", extra: 1 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enviado: true, mensajes: [] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/playground\/options$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ clave: "ver_mis_citas", connection_id: CONEXION });
    const h = init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer token-de-prueba");
    expect(h["X-Tenant-Id"]).toBe("t-1");
  });

  it("sin conexión no manda connection_id", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ enviado: true, mensajes: [] }), { status: 200 }));
    await OPTIONS_POST(cuerpo({ clave: "ver_mis_citas" }));
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({ clave: "ver_mis_citas" });
  });

  it("una clave o una conexión inválidas no llegan a la API", async () => {
    for (const malo of [{}, { clave: "" }, { clave: "../admin" }, { clave: "Mayus" }, { clave: 3 }, { clave: "a".repeat(41) }, { clave: "ok", connection_id: "no-uuid" }, { clave: "ok", connection_id: 5 }]) {
      expect((await OPTIONS_POST(cuerpo(malo))).status, JSON.stringify(malo)).toBe(400);
    }
    expect((await OPTIONS_POST(new Request("http://panel.test/x", { method: "POST", body: "no es json" }))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("la bandera apagada y los permisos pasan con su código y estado", async () => {
    fetchMock.mockResolvedValueOnce(errorApi(404, "opciones_directas_no_habilitadas"));
    const apagada = await OPTIONS_POST(cuerpo({ clave: "ver_mis_citas" }));
    expect(apagada.status).toBe(404);
    expect(await apagada.json()).toMatchObject({ code: "opciones_directas_no_habilitadas", error: "Mensaje de la API." });

    fetchMock.mockResolvedValueOnce(errorApi(403, "forbidden"));
    expect((await OPTIONS_POST(cuerpo({ clave: "ver_mis_citas" }))).status).toBe(403);
    fetchMock.mockResolvedValueOnce(errorApi(409, "no_publicada"));
    expect(await (await OPTIONS_POST(cuerpo({ clave: "ver_mis_citas" }))).json()).toMatchObject({ code: "no_publicada" });
  });

  it("si el backend no responde, 502 con mensaje", async () => {
    fetchMock.mockRejectedValue(new Error("caído"));
    expect((await OPTIONS_POST(cuerpo({ clave: "ver_mis_citas" }))).status).toBe(502);
  });
});

describe("BFF del playground: tocar un botón", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reenvía solo el payload (y la conexión) a /admin/playground/tap", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ outcome: "ok", mensajes: [] }), { status: 200 }));
    const res = await TAP_POST(cuerpo({ payload: "opt:abc.def", connection_id: CONEXION, otro: "x" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ outcome: "ok", mensajes: [] });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/playground\/tap$/);
    expect(JSON.parse(String(init.body))).toEqual({ payload: "opt:abc.def", connection_id: CONEXION });
  });

  it("optc: y optn: (confirmar y cancelar) también pasan", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ outcome: "ok", mensajes: [] }), { status: 200 }));
    expect((await TAP_POST(cuerpo({ payload: "optc:abc" }))).status).toBe(200);
    expect((await TAP_POST(cuerpo({ payload: "optn:abc" }))).status).toBe(200);
  });

  it("lo que no es un botón de opciones no llega a la API", async () => {
    for (const malo of [{}, { payload: "" }, { payload: "hola" }, { payload: "opt:con espacio" }, { payload: `opt:${"a".repeat(260)}` }, { payload: 3 }, { payload: "opt:a", connection_id: "no-uuid" }]) {
      expect((await TAP_POST(cuerpo(malo))).status, JSON.stringify(malo)).toBe(400);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("la bandera apagada pasa con su código: la pantalla puede explicarla", async () => {
    fetchMock.mockResolvedValue(errorApi(404, "opciones_directas_no_habilitadas"));
    const res = await TAP_POST(cuerpo({ payload: "opt:abc" }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ code: "opciones_directas_no_habilitadas" });
  });
});
