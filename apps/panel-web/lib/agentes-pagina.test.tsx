// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { violacionesGraves } from "@/lib/testing/axe";
import { agentes, conversacionesDeAgente, me, tareasVacias } from "@/lib/testing/fixtures";
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
    for (const pestana of ["Conversaciones", "Tareas", "Clientes y registros", "Consumo y calidad"]) {
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

  it("un ref que no es id ni `general` es 404", async () => {
    await expect(abrir("ventas")).rejects.toThrow("NOT_FOUND");
  });
});
