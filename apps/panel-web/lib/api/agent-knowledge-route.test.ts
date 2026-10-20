import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF del conocimiento del agente (HU-AOS-49): ids validados, subida multipart con solo los campos
// que la API conoce y errores con su `code` (tope del plan, archivo repetido).

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { DELETE } from "@/app/api/agent-knowledge/[id]/documents/[docId]/route";
import { POST as REPROCESAR } from "@/app/api/agent-knowledge/[id]/documents/[docId]/reprocess/route";
import { GET, POST } from "@/app/api/agent-knowledge/[id]/documents/route";

const AGENTE = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const DOC = "1c7f7e4f-7b54-4d4a-8b63-5c7d2d2f3a21";
const params = () => ({ params: Promise.resolve({ id: AGENTE }) });
const deDoc = (docId: string) => ({ params: Promise.resolve({ id: AGENTE, docId }) });

describe("BFF del conocimiento", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    cookies.set("panel_session", "token-de-prueba");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lista con la sesión y el negocio de las cookies", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    const res = await GET(new Request("http://panel.test/x"), params());
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/pack/pack_knowledge/agents/${AGENTE}/documents$`));
    expect(init.headers).toEqual({ Authorization: "Bearer token-de-prueba", "X-Tenant-Id": "t-1" });
  });

  it("un id que no es uuid no llega a la API", async () => {
    const res = await GET(new Request("http://panel.test/x"), { params: Promise.resolve({ id: "../admin" }) });
    expect(res.status).toBe(400);
    const borrar = await DELETE(new Request("http://panel.test/x"), deDoc("1 OR 1=1"));
    expect(borrar.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sin sesión responde 401 sin llamar a la API", async () => {
    cookies.delete("panel_session");
    const res = await GET(new Request("http://panel.test/x"), params());
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("la subida reenvía solo el archivo y el título", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: DOC, estado: "pendiente" }), { status: 202 }));
    const form = new FormData();
    form.set("archivo", new File(["hola"], "faq.md", { type: "" }));
    form.set("titulo", "  Preguntas frecuentes  ");
    form.set("tenant_id", "otro-negocio");
    const res = await POST(new Request("http://panel.test/x", { method: "POST", body: form }), params());
    expect(res.status).toBe(202);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const enviado = init.body as FormData;
    expect([...enviado.keys()].sort()).toEqual(["archivo", "titulo"]);
    expect(enviado.get("titulo")).toBe("Preguntas frecuentes");
    expect((enviado.get("archivo") as File).name).toBe("faq.md");
  });

  it("sin archivo no llega a la API", async () => {
    const form = new FormData();
    form.set("titulo", "x");
    const res = await POST(new Request("http://panel.test/x", { method: "POST", body: form }), params());
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el error conserva el `code` y los detalles de la API", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "plan_limit_documentos",
            message: "Tu plan permite 3 documento(s) de conocimiento y ya tienes 3.",
            details: { metric: "documentos", used: 3, limit: 3 },
          },
        }),
        { status: 409 },
      ),
    );
    const form = new FormData();
    form.set("archivo", new File(["x"], "a.txt"));
    const res = await POST(new Request("http://panel.test/x", { method: "POST", body: form }), params());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Tu plan permite 3 documento(s) de conocimiento y ya tienes 3.",
      code: "plan_limit_documentos",
      details: { metric: "documentos", used: 3, limit: 3 },
    });
  });

  it("borrar devuelve el 204 y reprocesar va a /reprocess", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const borrar = await DELETE(new Request("http://panel.test/x"), deDoc(DOC));
    expect(borrar.status).toBe(204);
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: DOC, estado: "pendiente" }), { status: 202 }));
    const reprocesar = await REPROCESAR(new Request("http://panel.test/x"), deDoc(DOC));
    expect(reprocesar.status).toBe(202);
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/agents/${AGENTE}/documents/${DOC}/reprocess$`));
    expect(init.method).toBe("POST");
  });
});
