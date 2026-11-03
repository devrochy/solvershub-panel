import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de gestión de crons (ADR-0183): nombre validado, lista blanca de acciones y el cuerpo de
// reprogramar reducido a `{ schedule }`. El master lo exige el servidor.

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (n: string) => (n === "panel_session" ? { value: "token-de-prueba" } : undefined) }),
}));

import { DELETE, POST, PUT } from "@/app/api/platform/crons/[name]/[accion]/route";

const NOMBRE = "core.billing_renovacion";
const ctx = (name: string, accion: string) => ({ params: Promise.resolve({ name, accion }) });
const cuerpo = (json: unknown) =>
  new Request("http://panel.test/x", { method: "PUT", body: JSON.stringify(json), headers: { "Content-Type": "application/json" } });

describe("BFF de crons", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(["run", "pause", "resume"])("%s llega a la API por POST", async (accion) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ queued: true }), { status: 202 }));
    const res = await POST(new Request("http://panel.test/x", { method: "POST" }), ctx(NOMBRE, accion));
    expect(res.status).toBe(202);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(new RegExp(`/api/v1/admin/platform/crons/${NOMBRE}/${accion}$`));
    expect(init.method).toBe("POST");
  });

  it.each([
    ["../admin", "run"],
    ["core.x/../y", "run"],
    ["Core.Billing", "run"],
    ["sin_punto", "run"],
    [NOMBRE, "schedule"],
    [NOMBRE, "delete"],
    [NOMBRE, ""],
  ])("POST %j/%j no llega a la API", async (name, accion) => {
    const res = await POST(new Request("http://panel.test/x", { method: "POST" }), ctx(name, accion));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reprogramar reenvía solo el horario", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ schedule: "0 5 * * *" }), { status: 200 }));
    const res = await PUT(cuerpo({ schedule: "0 5 * * *", paused: true, name: "otro" }), ctx(NOMBRE, "schedule"));
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/crons\/core\.billing_renovacion\/schedule$/);
    expect(init.method).toBe("PUT");
    expect(JSON.parse(String(init.body))).toEqual({ schedule: "0 5 * * *" });
  });

  it("un horario inválido o un cuerpo raro se rechaza sin llamar a la API", async () => {
    for (const malo of [{ schedule: "61 * * * *" }, { schedule: 5 }, {}, null]) {
      const res = await PUT(cuerpo(malo), ctx(NOMBRE, "schedule"));
      expect(res.status).toBe(400);
    }
    expect((await PUT(cuerpo({ schedule: "0 5 * * *" }), ctx(NOMBRE, "run"))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("restaurar usa DELETE sobre schedule", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ overridden: false }), { status: 200 }));
    const res = await DELETE(new Request("http://panel.test/x", { method: "DELETE" }), ctx(NOMBRE, "schedule"));
    expect(res.status).toBe(200);
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe("DELETE");
    expect((await DELETE(new Request("http://panel.test/x"), ctx(NOMBRE, "run"))).status).toBe(400);
  });

  it("pasa el error de la API con su estado y mensaje", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { code: "cron_conflict", message: "Este cron ya se está ejecutando." } }), { status: 409 }),
    );
    const res = await POST(new Request("http://panel.test/x", { method: "POST" }), ctx(NOMBRE, "run"));
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("ya se está ejecutando");
  });
});
