import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de versiones (HU-AOS-27): solo las acciones conocidas llegan a la API, con ids válidos, y el
// 409 del gate conserva su `details`.

const cookies = new Map<string, string>([["panel_session", "token-de-prueba"], ["panel_tenant", "t-1"]]);
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nombre: string) => (cookies.has(nombre) ? { value: cookies.get(nombre) } : undefined) }),
}));

import { GET, POST } from "@/app/api/connections/[id]/versiones/[rid]/[accion]/route";
import { POST as VOLVER } from "@/app/api/connections/[id]/volver-atras/route";

const C = "00000000-0000-4000-8000-0000000000c1";
const R = "00000000-0000-4000-8000-000000000004";
const ctx = (accion: string, id = C, rid = R) => ({ params: Promise.resolve({ id, rid, accion }) });
const req = (url = "http://panel.test/x") => new Request(url, { method: "POST" });

describe("BFF de versiones", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("traduce publicar, medir y detener a promote, evaluate y stop", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    for (const [accion, destino] of [["publicar", "promote"], ["medir", "evaluate"], ["detener", "stop"]]) {
      await POST(req(), ctx(accion));
      const [url] = fetchMock.mock.calls.at(-1) as [string, RequestInit];
      expect(url).toMatch(new RegExp(`/admin/connections/${C}/releases/${R}/${destino}$`));
    }
    expect(JSON.parse(String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body))).toEqual({ reason: "panel_versiones" });
  });

  it("rechaza acciones desconocidas o ids inválidos sin llamar a la API", async () => {
    expect((await POST(req(), ctx("borrar"))).status).toBe(400);
    expect((await POST(req(), ctx("publicar", "../x"))).status).toBe(400);
    expect((await GET(req(`http://panel.test/x?contra=../y`), ctx("diferencias"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el 409 del gate llega con su details", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "gate_pendiente", message: "x", details: { estado: "en_curso" } } }), { status: 409 }),
    );
    const res = await POST(req(), ctx("publicar"));
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "gate_pendiente", details: { estado: "en_curso" } });
  });

  it("diferencias y volver atrás", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await GET(new Request(`http://panel.test/x?contra=${R}`), ctx("diferencias"));
    expect((fetchMock.mock.calls[0] as [string])[0]).toMatch(new RegExp(`/releases/${R}/diff\\?against=${R}$`));
    await VOLVER(req(), { params: Promise.resolve({ id: C }) });
    expect((fetchMock.mock.calls[1] as [string])[0]).toMatch(new RegExp(`/admin/connections/${C}/rollback$`));
  });
});
