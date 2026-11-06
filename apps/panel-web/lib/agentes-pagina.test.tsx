// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { violacionesGraves } from "@/lib/testing/axe";
import { agentes, consolaConexiones, conversacionesDeAgente, me, tareasVacias } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Vista de un agente (HU-AOS-47): pestañas, estado vacío que explica cómo probar y la pestaña de
// conversaciones solo para quien puede verlas (nunca un 403 por diseño).

const respuestas: Record<string, unknown> = {};
const llamadas: string[] = [];

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    llamadas.push(ruta);
    const data = respuestas[ruta.split("?")[0]];
    return data === undefined ? { ok: false, status: 404, error: "sin fixture" } : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/agentes/general",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

// El chat de prueba pide su historial al montar: aquí basta con saber por qué conexión se abrió.
vi.mock("@/app/(app)/asistente/_components/chat-prueba", () => ({
  ChatPrueba: ({ conexionId }: { conexionId?: string }) => <div data-testid="chat">{conexionId}</div>,
}));

type Pagina = (props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string>>;
}) => Promise<ReactNode>;

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  llamadas.length = 0;
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

async function abrir(id: string, sp: Record<string, string> = {}) {
  const Pagina = (await import("@/app/(app)/agentes/[id]/page")).default as Pagina;
  const arbol = await resolverServidor(await Pagina({ params: Promise.resolve({ id }), searchParams: Promise.resolve(sp) }));
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

describe("vista de un agente", () => {
  it("muestra sus conversaciones con conexión y versión, y las cuatro pestañas", async () => {
    Object.assign(respuestas, {
      "/admin/agents/overview": agentes,
      "/admin/me": me,
      "/admin/agents/general/conversations": conversacionesDeAgente,
    });
    const { container } = await abrir("general", { dias: "7" });
    expect(screen.getByRole("heading", { level: 1, name: "General" })).toBeTruthy();
    expect(screen.getByText("test-Ana")).toBeTruthy();
    expect(screen.getByText("v3")).toBeTruthy();
    for (const pestana of ["Conversaciones", "Tareas", "Clientes y registros", "Consumo y calidad", "Conexiones", "Superpoderes", "Conocimiento", "Probar"]) {
      expect(screen.getByRole("link", { name: pestana })).toBeTruthy();
    }
    expect(llamadas.some((r) => r.startsWith("/admin/agents/general/conversations?desde="))).toBe(true);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("sin datos explica qué va a aparecer y cómo probarlo", async () => {
    Object.assign(respuestas, {
      "/admin/agents/overview": agentes,
      "/admin/me": me,
      [`/admin/agents/${agentes.items[1].ref}/tasks`]: tareasVacias,
    });
    await abrir(agentes.items[1].ref, { tab: "tareas" });
    expect(screen.getByText("Todavía no hay tareas de Ventas")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Abrir el chat web" }).getAttribute("href")).toBe("/configuracion?tab=web-chat");
  });

  it("sin permiso de conversaciones no muestra esa pestaña ni la pide", async () => {
    const permisos = Object.fromEntries(Object.entries(me.permissions ?? {}).filter(([k]) => k !== "conversations"));
    Object.assign(respuestas, {
      "/admin/agents/overview": agentes,
      "/admin/me": { ...me, role: "colaborador", permissions: permisos },
      "/admin/agents/general/tasks": tareasVacias,
    });
    await abrir("general");
    expect(screen.queryByRole("link", { name: "Conversaciones" })).toBeNull();
    expect(llamadas.some((r) => r.includes("/conversations"))).toBe(false);
  });

  it("sin la sección de costos no muestra el costo, pero sí turnos y tokens", async () => {
    const fila = { turns: 2, input_tokens: 10, output_tokens: 5, cost_usd: null };
    Object.assign(respuestas, {
      "/admin/agents/overview": agentes,
      "/admin/me": me,
      "/admin/agents/general/usage": {
        periodo: { desde: "2026-09-18T00:00:00Z", hasta: "2026-10-18T00:00:00Z" },
        incluye_sin_atribuir: true,
        total: fila,
        by_connection: [{ ...fila, connection_id: null, connection_label: null }],
        by_day: [{ ...fila, day: "2026-10-18" }],
        consistency: { scope: "negocio", measurements: [] },
      },
      "/admin/agents/general/conversations": {
        ...conversacionesDeAgente,
        items: conversacionesDeAgente.items.map((c) => ({ ...c, cost_usd: null })),
      },
    });
    await abrir("general", { tab: "consumo" });
    expect(screen.getByText("Turnos atendidos")).toBeTruthy();
    expect(screen.queryByText("Costo del período")).toBeNull();
    expect(screen.queryByRole("columnheader", { name: /costo/i })).toBeNull();
    cleanup();
    await abrir("general");
    expect(screen.getByText("test-Ana")).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: /costo/i })).toBeNull();
  });

  it("un ref que no es id ni `general` es 404", async () => {
    await expect(abrir("ventas")).rejects.toThrow("NOT_FOUND");
  });
});

describe("ficha del agente (HU-UX-09)", () => {
  const VENTAS = agentes.items[1];
  const ID = VENTAS.id as string;
  const CONEXION = consolaConexiones.items[0];
  const consola = {
    ...consolaConexiones,
    items: [
      {
        ...CONEXION,
        agents: [
          {
            instance_id: "test-inst-1",
            agent_id: ID,
            key: "ventas",
            name: "Ventas",
            role: "specialist" as const,
            is_default: true,
            enabled: true,
            priority: 100,
            release_version: 3,
            latest_version: 3,
          },
        ],
      },
      consolaConexiones.items[1],
    ],
  };
  const detalle = {
    id: ID,
    key: "ventas",
    kind: "specialist",
    contract: "agentspec/3",
    name: "Ventas",
    description: "Toma pedidos y resuelve dudas de productos",
    status: "active",
    latest_version: 3,
    created_at: "2026-10-01T00:00:00Z",
    draft: {
      content: { procedures: [{ id: "pack_commerce.tomar_pedido", version: "^1.0" }] },
      lock_version: 2,
      base_version_id: null,
      updated_at: "2026-10-01T00:00:00Z",
    },
    versions: [{ id: "v3", version: 3, label: "", contract: "", content_hash: "", notes: "", legacy: false, created_at: "2026-10-02T00:00:00Z" }],
  };
  const fiabilidad = {
    minimum_sample: { turns: 30, tasks: 5 },
    operational: {
      by_agent: [
        { instance_id: "test-inst-1", name: "Ventas", turns: 40, escalated: 4, escalation_rate: 0.1, p95_ms: null, cost_usd: null },
        { instance_id: "otra", name: "Otro", turns: 100, escalated: 100, escalation_rate: 1, p95_ms: null, cost_usd: null },
      ],
    },
  };
  const uso = {
    periodo: { desde: "2026-10-30T00:00:00Z", hasta: "2026-11-06T00:00:00Z" },
    incluye_sin_atribuir: false,
    total: { turns: 40, input_tokens: 10, output_tokens: 5, cost_usd: 1.25 },
    by_connection: [],
    by_day: [],
    consistency: { scope: "negocio", measurements: [] },
  };

  function base() {
    Object.assign(respuestas, {
      "/admin/agents/overview": agentes,
      "/admin/me": me,
      "/admin/connections/console": consola,
      [`/admin/agents/${ID}`]: detalle,
      "/admin/reliability": fiabilidad,
      [`/admin/agents/${ID}/usage`]: uso,
      [`/admin/agents/${ID}/conversations`]: { ...conversacionesDeAgente, total: 7 },
    });
  }

  it("cabecera: selector de agentes, propósito, «Publicado · vX», Editar e indicadores de 7 días", async () => {
    base();
    const { container } = await abrir(ID, { tab: "conexiones" });
    const selector = screen.getByRole("navigation", { name: "Tus agentes" });
    expect(within(selector).getByRole("link", { name: /Ventas/ }).getAttribute("aria-current")).toBe("page");
    expect(within(selector).getByRole("link", { name: /General/ }).getAttribute("href")).toBe("/agentes/general");
    expect(screen.getByText("Especialista · Toma pedidos y resuelve dudas de productos")).toBeTruthy();
    expect(screen.queryByText(/Atiende en/)).toBeNull();
    expect(screen.getByText("Publicado · v3")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Editar" }).getAttribute("href")).toBe(`/agentes/${ID}/editar`);
    const indicadores = screen.getByRole("region", { name: "Indicadores de los últimos 7 días" });
    expect(indicadores.textContent).toContain("Conversaciones · 7 días7");
    // 4 escaladas de 40 respuestas del agente: la otra instancia no cuenta.
    expect(indicadores.textContent).toContain("90 %");
    expect(indicadores.textContent).toMatch(/1,25/);
    expect(llamadas.some((r) => r.startsWith(`/admin/agents/${ID}/conversations?desde=`) && r.includes("page_size=1"))).toBe(true);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("pestaña Conexiones: tabla enlazada a la ficha de cada conexión y sin filtros de período", async () => {
    base();
    await abrir(ID, { tab: "conexiones" });
    const tabla = screen.getByRole("table", { name: "Conexiones donde atiende Ventas" });
    expect(within(tabla).getByRole("link", { name: "WhatsApp principal" }).getAttribute("href")).toBe("/conexiones/test-conn-1");
    expect(tabla.textContent).toContain("WhatsApp oficial (Meta)");
    expect(tabla.textContent).toContain("Especialista");
    expect(tabla.textContent).not.toContain("Google Calendar");
    expect(screen.getByRole("link", { name: "Asignar a una conexión" }).getAttribute("href")).toBe(`/agentes/${ID}/editar?paso=publicar`);
    expect(screen.queryByLabelText(/Período/i)).toBeNull();
    // Una sola llamada a la consola para todo el negocio, no una por conexión.
    expect(llamadas.filter((r) => r.startsWith("/admin/connections")).length).toBe(1);
  });

  it("pestaña Superpoderes: interruptores con la habilidad de origen", async () => {
    base();
    Object.assign(respuestas, {
      "/admin/agent-superpowers": {
        items: [
          { id: "pack_commerce.tomar_pedido", version: "1.0.0", skill: "pack_commerce", title: "Tomar pedidos", description: "", phrases: ["a", "b", "c"] },
        ],
        total: 1,
        page: 1,
        page_size: 100,
        has_more: false,
      },
      "/admin/plugins": [{ id: "pack_commerce", display_name: "Comercio" }],
    });
    const { container } = await abrir(ID, { tab: "superpoderes" });
    expect(screen.getByRole("switch", { name: "Tomar pedidos" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("De la habilidad Comercio")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("pestaña Probar: el chat corre por la conexión principal del agente", async () => {
    base();
    await abrir(ID, { tab: "probar" });
    expect(screen.getByTestId("chat").textContent).toBe("test-conn-1");
    expect(screen.getByRole("heading", { name: "Probar en WhatsApp principal" })).toBeTruthy();
  });

  it("si la consola no responde, la ficha abre igual y lo explica", async () => {
    base();
    delete respuestas["/admin/connections/console"];
    await abrir(ID, { tab: "conexiones" });
    expect(screen.getByText(/No se pudo cargar el detalle de las conexiones/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "test-Chat web" }).getAttribute("href")).toBe("/conexiones/00000000-0000-4000-8000-0000000000c1");
    expect(screen.getByRole("region", { name: "Indicadores de los últimos 7 días" }).textContent).toContain("Sin datos por ahora.");
  });
});
