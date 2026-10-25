// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { violacionesGraves } from "@/lib/testing/axe";
import { agentes, agentesDelNegocio, consolaConexiones, grafoA2A, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Colaboración entre agentes (HU-AOS-26): la lista accesible de permisos, el aviso de ciclo antes
// de guardar, la acción de guardar solo para quien puede, y «Probar una frase».

const respuestas: Record<string, unknown> = {};

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    const data = respuestas[ruta.split("?")[0]];
    return data === undefined ? { ok: false, status: 403, error: "sin permiso" } : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/agentes/colaboracion",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false, media: query, onchange: null, addListener: () => undefined, removeListener: () => undefined,
    addEventListener: () => undefined, removeEventListener: () => undefined, dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

async function abrir(extra: Record<string, unknown> = {}) {
  Object.assign(
    respuestas,
    {
      "/admin/a2a/graph": grafoA2A,
      "/admin/agents": agentesDelNegocio,
      "/admin/me": me,
      "/admin/agents/overview": agentes,
      "/admin/connections/console": consolaConexiones,
    },
    extra,
  );
  const Pagina = (await import("@/app/(app)/agentes/colaboracion/page")).default as () => Promise<ReactNode>;
  const arbol = await resolverServidor(await Pagina());
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

describe("colaboración entre agentes", () => {
  it("lista los permisos de cada especialista, sin el Coordinador, y es accesible", async () => {
    const { container } = await abrir();
    expect(screen.getByRole("heading", { level: 1, name: "Colaboración" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ventas puede…" })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Coordinador puede…" })).toBeNull();
    const consultar = screen.getAllByRole("checkbox", { name: "Consultar" });
    expect(consultar.map((c) => c.getAttribute("aria-checked"))).toEqual(["false", "true"]);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("avisa el ciclo de pasar la conversación antes de guardar", async () => {
    await abrir();
    const guardar = screen.getByRole("button", { name: "Guardar permisos" }) as HTMLButtonElement;
    expect(guardar.disabled).toBe(true);
    for (const c of screen.getAllByRole("checkbox", { name: "Pasar la conversación" })) fireEvent.click(c);
    expect(screen.getByRole("status").textContent).toMatch(/Ventas → Agenda → Ventas/);
    expect(guardar.disabled).toBe(false);
  });

  it("guarda los permisos por el BFF con los campos que ya tenía el enlace", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ ...grafoA2A, created: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await abrir();
    fireEvent.click(screen.getAllByRole("checkbox", { name: "Encargar" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Guardar permisos" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/a2a/graph");
    const enviado = JSON.parse(String(init.body)).links as { modes: string[]; budget_usd?: number }[];
    expect(enviado).toHaveLength(1);
    expect(enviado[0].modes).toEqual(["delegate", "query"]);
    expect(enviado[0].budget_usd).toBe(0.02);
  });

  it("sin permiso de escritura muestra los permisos pero no los deja cambiar", async () => {
    await abrir({ "/admin/me": { ...me, role: "colaborador", permissions: { ...me.permissions, settings: "read" } } });
    expect(screen.queryByRole("button", { name: "Guardar permisos" })).toBeNull();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
    expect(screen.getAllByText("Consultar: sí")).toHaveLength(1);
  });

  it("sin acceso a las conexiones no ofrece probar una frase", async () => {
    await abrir({ "/admin/connections/console": undefined });
    expect(screen.queryByRole("heading", { name: "Probar una frase" })).toBeNull();
  });

  it("probar una frase explica qué agente la atendería", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          mode: "active", source: "trigger", agent_key: "agenda", agent_id: agentesDelNegocio[1].id,
          procedure_id: "pack_calendar.agendar_cita", rule_id: null, confidence: 0.9,
          candidates: [{ procedure_id: "pack_calendar.agendar_cita", owner: "agenda", score: 0.9 }], not_evaluated_rules: [],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await abrir();
    fireEvent.change(screen.getByLabelText("Frase de un cliente"), { target: { value: "quiero agendar una demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Probar" }));
    expect(await screen.findByText(/La atendería/)).toBeTruthy();
    expect(screen.getByText("Agenda", { selector: "strong" })).toBeTruthy();
    expect(screen.getByText(/90 % de coincidencia/)).toBeTruthy();
  });
});
