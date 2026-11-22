import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de «Exportar conversaciones» (HU-BILL-25, HU-BILL-27): reenvía el CSV de la API con la sesión del panel
// y, si el plan no lo incluye, el 409 con su código para que el panel ofrezca mejorar el plan.

const sesion = vi.hoisted(() => ({ token: "token-de-prueba" as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (nombre: string) => (nombre === "panel_session" && sesion.token ? { value: sesion.token } : nombre === "panel_tenant" ? { value: "t-1" } : undefined),
  }),
}));

import { GET } from "@/app/api/conversations/export/route";

describe("BFF GET /api/conversations/export", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    sesion.token = "token-de-prueba";
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("descarga el CSV con la sesión y el negocio, y conserva el aviso de recorte", async () => {
    fetchMock.mockResolvedValue(
      new Response("﻿conversacion,mensaje\nc1,Hola\n", { status: 200, headers: { "X-Export-Truncated": "true" } }),
    );
    const res = await GET();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/admin\/conversations\/export\.csv$/);
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-de-prueba", "X-Tenant-Id": "t-1" });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
    expect(res.headers.get("Content-Disposition")).toMatch(/^attachment; filename="conversaciones-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.headers.get("X-Export-Truncated")).toBe("true");
    expect(await res.text()).toContain("c1,Hola");
  });

  it("el 409 del plan llega con su código y detalles", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "plan_feature_not_included", message: "Tu plan Basic no incluye exportar.", details: { feature: "exportar", plan: "basic" } } }),
        { status: 409 },
      ),
    );
    const res = await GET();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Tu plan Basic no incluye exportar.",
      code: "plan_feature_not_included",
      details: { feature: "exportar", plan: "basic" },
    });
  });

  it("sin sesión no llama a la API", async () => {
    sesion.token = undefined;
    expect((await GET()).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
