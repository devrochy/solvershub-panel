import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// BFF de las pruebas del agente (SPEC-53, HU-AOS-105): reenvía a `/admin/agents/{id}/pruebas…`, valida cada id de la
// ruta y deja pasar el `code` y los `details` del error (`estimado_cambio` trae el estimado vigente).

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (n: string) =>
      n === "panel_session" ? { value: "token-de-prueba" } : undefined,
  }),
}));

import {
  GET as listar,
  POST as escribir,
} from "@/app/api/agentes/[id]/pruebas/route";
import { POST as estimar } from "@/app/api/agentes/[id]/pruebas/estimado/route";
import { POST as lanzar } from "@/app/api/agentes/[id]/pruebas/corridas/route";
import { GET as informe } from "@/app/api/agentes/[id]/pruebas/corridas/[runId]/route";
import { POST as volver } from "@/app/api/agentes/[id]/pruebas/corridas/[runId]/volver-a-probar/route";
import { POST as aplicar } from "@/app/api/agentes/[id]/pruebas/resultados/[resultId]/aplicar/route";
import { POST as juez } from "@/app/api/agentes/[id]/pruebas/resultados/[resultId]/juez-equivocado/route";
import {
  PATCH as editar,
  DELETE as borrar,
} from "@/app/api/agentes/[id]/pruebas/[caseId]/route";

const A = "11111111-1111-4111-8111-111111111111";
const R = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const ctx = (extra: Record<string, string> = {}) => ({
  params: Promise.resolve({ id: A, ...extra }),
});
const pedido = (body?: unknown) =>
  new Request("http://panel.test/x", {
    method: "POST",
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe("BFF de las pruebas del agente", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const llamada = () => fetchMock.mock.calls[0] as [string, RequestInit];

  it("lista los escenarios con la sesión del dueño", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ escenarios: [], tope: 50, ultima_corrida: null }),
        { status: 200 },
      ),
    );
    const res = await listar(new Request("http://panel.test/x"), ctx());
    expect(res.status).toBe(200);
    const [url, init] = llamada();
    expect(url).toMatch(new RegExp(`/api/v1/admin/agents/${A}/pruebas$`));
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-de-prueba",
    );
  });

  it("escribe un escenario, estima y lanza reenviando el cuerpo tal cual", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ id: C }), { status: 201 }),
    );
    await escribir(pedido({ titulo: "t", objetivo_cliente: "o" }), ctx());
    expect(JSON.parse(llamada()[1].body as string)).toEqual({
      titulo: "t",
      objetivo_cliente: "o",
    });

    fetchMock.mockClear();
    await estimar(pedido({ case_ids: [C] }), ctx());
    expect(llamada()[0]).toMatch(/\/pruebas\/estimado$/);

    fetchMock.mockClear();
    await lanzar(
      pedido({ case_ids: [C], k: 2, confirmo_creditos: 160 }),
      ctx(),
    );
    expect(llamada()[0]).toMatch(/\/pruebas\/corridas$/);
    expect(JSON.parse(llamada()[1].body as string)).toEqual({
      case_ids: [C],
      k: 2,
      confirmo_creditos: 160,
    });
  });

  it("el informe, volver a probar, aplicar y «no es una falla» usan el id de la corrida y del resultado", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await informe(new Request("http://panel.test/x"), ctx({ runId: R }));
    expect(llamada()[0]).toMatch(new RegExp(`/pruebas/corridas/${R}$`));

    fetchMock.mockClear();
    await volver(pedido({ k: 1, confirmo_creditos: 40 }), ctx({ runId: R }));
    expect(llamada()[0]).toMatch(
      new RegExp(`/pruebas/corridas/${R}/volver-a-probar$`),
    );

    fetchMock.mockClear();
    await aplicar(
      pedido({ confirmo: true, lock_version: 7 }),
      ctx({ resultId: R }),
    );
    expect(llamada()[0]).toMatch(
      new RegExp(`/pruebas/resultados/${R}/aplicar$`),
    );
    expect(JSON.parse(llamada()[1].body as string)).toEqual({
      confirmo: true,
      lock_version: 7,
    });

    fetchMock.mockClear();
    await juez(pedido({ juez_equivocado: true }), ctx({ resultId: R }));
    expect(llamada()[0]).toMatch(/\/juez-equivocado$/);
  });

  it("edita y borra un escenario por su id", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
    await editar(pedido({ estado: "aprobado" }), ctx({ caseId: C }));
    expect(llamada()[1].method).toBe("PATCH");
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const res = await borrar(pedido(), ctx({ caseId: C }));
    expect(res.status).toBe(204);
    expect(llamada()[1].method).toBe("DELETE");
  });

  it("un id que no es UUID no llega al backend", async () => {
    const res = await informe(
      new Request("http://panel.test/x"),
      ctx({ runId: "../../admin" }),
    );
    expect(res.status).toBe(400);
    const sinAgente = await listar(new Request("http://panel.test/x"), {
      params: Promise.resolve({ id: "x" }),
    });
    expect(sinAgente.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("el 409 conserva el código y los detalles", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "estimado_cambio",
            message: "Cambió.",
            details: { estimado: 90 },
          },
        }),
        { status: 409 },
      ),
    );
    const res = await lanzar(
      pedido({ case_ids: [C], k: 1, confirmo_creditos: 80 }),
      ctx(),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "Cambió.",
      code: "estimado_cambio",
      details: { estimado: 90 },
    });
  });
});
