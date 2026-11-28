import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de la bandeja de reportes (SPEC-54, HU-FB-06): solo viajan los filtros válidos, la acción va en
// lista blanca y el cuerpo de aprobar y rechazar se rearma. Los errores del servidor (409, 422) pasan
// con su `code` y `details` para que la UI muestre un mensaje claro.

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "panel_session" ? { value: "token-de-prueba" } : undefined) }),
}));

import { GET as bandeja } from "@/app/api/platform/feedback/reports/route";
import { GET as detalle } from "@/app/api/platform/feedback/reports/[id]/route";
import { POST } from "@/app/api/platform/feedback/reports/[id]/[accion]/route";

const ID = "3f1c2b6e-8a4d-4c1e-9b7a-2d5e6f708192";
const NEGOCIO = "a1b2c3d4-e5f6-4789-abcd-ef0123456789";
const ctx = (id: string, accion: string) => ({ params: Promise.resolve({ id, accion }) });
const post = (json?: unknown) =>
  new Request("http://panel.test/x", {
    method: "POST",
    body: json === undefined ? undefined : JSON.stringify(json),
    headers: { "Content-Type": "application/json" },
  });

describe("BFF de la bandeja de reportes", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("la bandeja reenvía solo los filtros válidos", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], next_cursor: null }), { status: 200 }));
    const url = `http://panel.test/api/platform/feedback/reports?estado=recibido&tipo=hack&tenant_id=${NEGOCIO}&cursor=abc%3D&otro=1`;
    const res = await bandeja(new Request(url));
    expect(res.status).toBe(200);
    const [destino] = fetchMock.mock.calls[0] as [string];
    const qs = new URL(destino).searchParams;
    expect(new URL(destino).pathname).toBe("/api/v1/platform/feedback/reports");
    expect(Object.fromEntries(qs)).toEqual({ estado: "recibido", tenant_id: NEGOCIO, cursor: "abc=", limit: "25" });
  });

  it("el detalle exige un UUID", async () => {
    const res = await detalle(new Request("http://panel.test/x"), { params: Promise.resolve({ id: "../admin" }) });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tomar llega por POST sin cuerpo", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID, estado: "en_revision" }), { status: 200 }));
    const res = await POST(post(), ctx(ID, "tomar"));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/platform/feedback/reports/${ID}/tomar$`));
    expect(init.method).toBe("POST");
    expect(init.body).toBeUndefined();
  });

  it("aprobar reenvía solo `creditos`", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID, estado: "aprobado" }), { status: 200 }));
    await POST(post({ creditos: 3000, tenant_id: NEGOCIO, estado: "aprobado" }), ctx(ID, "aprobar"));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ creditos: 3000 });
  });

  it.each([0, -5, 1.5, "3000", null])("aprobar con %j no llega a la API", async (creditos) => {
    const res = await POST(post({ creditos }), ctx(ID, "aprobar"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rechazar reenvía solo los campos del contrato y descarta `duplicado_de` si no es duplicado", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID, estado: "rechazado" }), { status: 200 }));
    await POST(
      post({ motivo_codigo: "no_reproducible", motivo: "  No lo pudimos reproducir.  ", nota_interna: " ", duplicado_de: ID, creditos: 9 }),
      ctx(ID, "rechazar"),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ motivo_codigo: "no_reproducible", motivo: "No lo pudimos reproducir." });
  });

  it("rechazar por duplicado exige el id del original", async () => {
    const res = await POST(post({ motivo_codigo: "duplicado", motivo: "Ya lo reportaron." }), ctx(ID, "rechazar"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID }), { status: 200 }));
    await POST(post({ motivo_codigo: "duplicado", motivo: "Ya lo reportaron.", duplicado_de: NEGOCIO, nota_interna: "ver el otro" }), ctx(ID, "rechazar"));
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ motivo_codigo: "duplicado", motivo: "Ya lo reportaron.", nota_interna: "ver el otro", duplicado_de: NEGOCIO });
  });

  it.each([
    [ID, "borrar"],
    [ID, ""],
    ["no-es-uuid", "tomar"],
  ])("POST %j/%j no llega a la API", async (id, accion) => {
    const res = await POST(post({ creditos: 10 }), ctx(id, accion));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el 422 de tope pasa con su `code` y `details`", async () => {
    const error = { error: { code: "tope_mensual_excedido", message: "Tope.", details: { maximo: 10000, regalado: 8000, disponible: 2000 } } };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(error), { status: 422 }));
    const res = await POST(post({ creditos: 3000 }), ctx(ID, "aprobar"));
    expect(res.status).toBe(422);
    expect(await res.json()).toMatchObject({ code: "tope_mensual_excedido", details: { maximo: 10000, regalado: 8000, disponible: 2000 } });
  });

  it("el 409 de reporte ya decidido pasa con el estado", async () => {
    const error = { error: { code: "reporte_ya_decidido", message: "Ya.", details: { estado: "aprobado" } } };
    fetchMock.mockResolvedValue(new Response(JSON.stringify(error), { status: 409 }));
    const res = await POST(post(), ctx(ID, "tomar"));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "reporte_ya_decidido", details: { estado: "aprobado" } });
  });
});
