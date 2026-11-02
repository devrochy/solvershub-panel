import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del asistente de Configuración (HU-CFG-11): solo secciones conocidas llegan a la API, con el negocio
// activo, y los errores (403, 409, 422) vuelven con su estado, su `code` y los campos por pregunta.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { POST as aplicar } from "@/app/api/settings/asistente/[seccion]/aplicar/route";
import { POST as vistaPrevia } from "@/app/api/settings/asistente/[seccion]/vista-previa/route";

const peticion = (json: unknown) =>
  new Request("http://panel.test/x", { method: "POST", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });
const ctx = (seccion: string) => ({ params: Promise.resolve({ seccion }) });
const propuesta = { seccion: "voz", cambios: [], omitidos: [], huella: "abc" };

describe("BFF del asistente de Configuración", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("vista previa: reenvía las respuestas al negocio activo y devuelve la propuesta", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(propuesta), { status: 200 }));
    const res = await vistaPrevia(peticion({ respuestas: { tono: "cercano", prohibidas: ["gratis"] } }), ctx("voz"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(propuesta);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/settings\/asistente\/voz\/vista-previa$/);
    expect(init.method).toBe("POST");
    expect(new Headers(init.headers).get("X-Tenant-Id")).toBe("t-1");
    expect(JSON.parse(init.body as string)).toEqual({ respuestas: { tono: "cercano", prohibidas: ["gratis"] } });
  });

  it("aplicar: manda también la huella de la vista previa", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(propuesta), { status: 200 }));
    const res = await aplicar(peticion({ respuestas: { tono: "cercano" }, huella: "abc" }), ctx("atencion"));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/settings\/asistente\/atencion\/aplicar$/);
    expect(JSON.parse(init.body as string)).toEqual({ respuestas: { tono: "cercano" }, huella: "abc" });
  });

  it("una sección fuera del guion es 404 y no llama a la API", async () => {
    expect((await vistaPrevia(peticion({ respuestas: {} }), ctx("identidad"))).status).toBe(404);
    expect((await aplicar(peticion({ respuestas: {}, huella: "x" }), ctx("../identity"))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("cuerpos mal formados son 400 y no llaman a la API", async () => {
    expect((await vistaPrevia(peticion({}), ctx("voz"))).status).toBe(400);
    expect((await vistaPrevia(peticion({ respuestas: [] }), ctx("voz"))).status).toBe(400);
    expect((await vistaPrevia(peticion({ respuestas: { tono: 3 } }), ctx("voz"))).status).toBe(400);
    expect((await vistaPrevia(peticion({ respuestas: { prohibidas: ["a", 2] } }), ctx("voz"))).status).toBe(400);
    expect((await aplicar(peticion({ respuestas: { tono: "cercano" } }), ctx("voz"))).status).toBe(400);
    expect((await aplicar(peticion({ respuestas: { tono: "cercano" }, huella: "" }), ctx("voz"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el 422 vuelve con los errores por pregunta", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "validation_error", message: "Revisa las respuestas marcadas.", fields: { tono: "Elige una de las opciones." } } }), { status: 422 }),
    );
    const res = await vistaPrevia(peticion({ respuestas: { tono: "otro" } }), ctx("voz"));
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({
      error: "Revisa las respuestas marcadas.",
      code: "validation_error",
      fields: { tono: "Elige una de las opciones." },
    });
  });

  it("el 409 de una vista previa vencida y el 403 de falta de permiso conservan su estado y su code", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "conflict", message: "La configuración cambió mientras decidías: revisa los cambios de nuevo." } }), { status: 409 }),
    );
    const vencida = await aplicar(peticion({ respuestas: { tono: "cercano" }, huella: "vieja" }), ctx("voz"));
    expect(vencida.status).toBe(409);
    expect(((await vencida.json()) as { code: string }).code).toBe("conflict");

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "forbidden", message: "Sin permiso." } }), { status: 403 }));
    const sinPermiso = await aplicar(peticion({ respuestas: { tono: "cercano" }, huella: "x" }), ctx("voz"));
    expect(sinPermiso.status).toBe(403);
  });
});
