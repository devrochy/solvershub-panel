import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de los reportes de clientes (SPEC-54, HU-FB-05): reenvía a `/api/v1/feedback…` con la sesión y el negocio
// de las cookies, pasa `Idempotency-Key` y devuelve `Retry-After`; solo los campos y filtros que la API conoce.

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) =>
      n === "panel_session" ? { value: "token-de-prueba" } : n === "panel_tenant" ? { value: "negocio-1" } : undefined,
  }),
}));

import { GET as getCatalogo } from "@/app/api/feedback/catalogo/route";
import { GET as getReporte } from "@/app/api/feedback/reports/[id]/route";
import { GET as getReportes, POST as postReporte } from "@/app/api/feedback/reports/route";

const ID = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const CLAVE = "0b8f6c1e-2d3a-4b5c-9d8e-7f6a5b4c3d2e";

function formulario(extra: (f: FormData) => void = () => {}) {
  const f = new FormData();
  f.set("tipo", "error");
  f.set("area", "conversations");
  f.set("titulo", "No carga el chat");
  f.set("descripcion", "Al abrir un chat la pantalla queda en blanco.");
  extra(f);
  return f;
}

const enviar = (body: FormData, clave: string | null = CLAVE) =>
  postReporte(
    new Request("http://panel.test/api/feedback/reports", {
      method: "POST",
      headers: clave ? { "Idempotency-Key": clave } : {},
      body,
    }),
  );

describe("BFF de reportes de clientes", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("envía el multipart con la clave, la sesión y el negocio, y conserva el 201", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID, estado: "recibido" }), { status: 201 }));
    const res = await enviar(
      formulario((f) => {
        f.append("adjuntos", new File([new Uint8Array([137, 80, 78, 71])], "captura.png", { type: "image/png" }));
        f.set("revisado_por", "otro-admin");
      }),
    );
    expect(res.status).toBe(201);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/feedback\/reports$/);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer token-de-prueba",
      "X-Tenant-Id": "negocio-1",
      "Idempotency-Key": CLAVE,
    });
    const body = init.body as FormData;
    expect([...body.keys()].sort()).toEqual(["adjuntos", "area", "descripcion", "tipo", "titulo"]);
    expect((body.get("adjuntos") as File).name).toBe("captura.png");
  });

  it("el replay (200) llega igual: el formulario lo trata como enviado", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: ID, estado: "recibido" }), { status: 200 }));
    const res = await enviar(formulario());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: ID });
  });

  it("sin clave válida o sin los campos no llega al backend", async () => {
    expect((await enviar(formulario(), null)).status).toBe(400);
    expect((await enviar(formulario(), "corta")).status).toBe(400);
    expect((await enviar(formulario(), "con espacios y ñ 1234")).status).toBe(400);
    const sinTitulo = formulario((f) => f.delete("titulo"));
    expect((await enviar(sinTitulo)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("en un 429 devuelve el código, el mensaje y `Retry-After`", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "demasiados_reportes", message: "Demasiados reportes." } }), {
        status: 429,
        headers: { "Retry-After": "1800" },
      }),
    );
    const res = await enviar(formulario());
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1800");
    expect(await res.json()).toEqual({ error: "Demasiados reportes.", code: "demasiados_reportes" });
  });

  it("un 413 sin cuerpo JSON (lo corta un proxy) trae un mensaje propio", async () => {
    fetchMock.mockResolvedValue(new Response("<html>413</html>", { status: 413 }));
    const res = await enviar(formulario());
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "Los adjuntos pesan demasiado." });
  });

  it("la lista solo reenvía alcance, estado y cursor conocidos", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ items: [], next_cursor: null }), { status: 200 }));
    await getReportes(new Request("http://panel.test/api/feedback/reports?alcance=negocio&estado=aprobado&cursor=abc&limit=999&x=1"));
    expect((fetchMock.mock.calls[0] as [string])[0]).toMatch(/\/api\/v1\/feedback\/reports\?alcance=negocio&estado=aprobado&cursor=abc$/);
    await getReportes(new Request("http://panel.test/api/feedback/reports?alcance=todos&estado=borrado"));
    expect((fetchMock.mock.calls[1] as [string])[0]).toMatch(/\/api\/v1\/feedback\/reports$/);
  });

  it("el detalle exige un id UUID y conserva el 404 de un reporte ajeno", async () => {
    const invalido = await getReporte(new Request("http://panel.test"), { params: Promise.resolve({ id: "../catalogo" }) });
    expect(invalido.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "not_found", message: "No existe." } }), { status: 404 }));
    const ajeno = await getReporte(new Request("http://panel.test"), { params: Promise.resolve({ id: ID }) });
    expect(ajeno.status).toBe(404);
    expect((fetchMock.mock.calls[0] as [string])[0]).toMatch(new RegExp(`/api/v1/feedback/reports/${ID}$`));
  });

  it("el catálogo pasa tal cual, también el 404 de los reportes apagados", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: { code: "not_found", message: "No existe." } }), { status: 404 }));
    const res = await getCatalogo();
    expect(res.status).toBe(404);
    expect((fetchMock.mock.calls[0] as [string])[0]).toMatch(/\/api\/v1\/feedback\/catalogo$/);
  });
});
