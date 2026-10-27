// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { AgentTemplatePage } from "@/lib/api/types";
import { agentes, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Página «Nuevo agente» (HU-AOS-54): el asistente solo para quien puede escribir en un negocio v3;
// el resto ve un aviso claro. Lee el runtime de `/admin/agents/overview`, no de otra ruta.

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
  usePathname: () => "/agentes/nuevo",
  useSearchParams: () => new URLSearchParams(),
}));

const PLANTILLAS: AgentTemplatePage = {
  items: [
    {
      key: "agenda",
      name: "Agenda",
      description: "Agenda citas.",
      section: "Agenda",
      tools: [],
      questions: [],
      skills: ["pack_calendar"],
      optional_skills: [],
      available: true,
      missing_skills: [],
      superpowers: [],
      requirements: [],
    },
  ],
  total: 1,
  page: 1,
  page_size: 100,
  pages: 1,
} as AgentTemplatePage;

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
});

afterEach(() => {
  cleanup();
  llamadas.length = 0;
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

async function abrir() {
  const Pagina = (await import("@/app/(app)/agentes/nuevo/page")).default as () => Promise<ReactNode>;
  return render(<FeedbackProviders>{await resolverServidor(await Pagina())}</FeedbackProviders>);
}

describe("página Nuevo agente", () => {
  it("con permiso y negocio v3 muestra el asistente y lee el runtime de la vista general", async () => {
    Object.assign(respuestas, {
      "/admin/agent-templates": PLANTILLAS,
      "/admin/me": me,
      "/admin/agents/overview": agentes,
    });
    await abrir();
    expect(screen.getByRole("heading", { name: "¿Qué quieres que haga?" })).toBeTruthy();
    expect(llamadas).toContain("/admin/agents/overview");
  });

  it("sin permiso de escritura en Ajustes ve un aviso y no el asistente", async () => {
    Object.assign(respuestas, {
      "/admin/agent-templates": PLANTILLAS,
      "/admin/me": { ...me, role: "colaborador", permissions: { settings: "read" } },
      "/admin/agents/overview": agentes,
    });
    await abrir();
    expect(screen.queryByRole("heading", { name: "¿Qué quieres que haga?" })).toBeNull();
    expect(screen.getByText(/permiso de escritura/)).toBeTruthy();
  });

  it("un negocio legacy que no es de master ve el aviso del General", async () => {
    Object.assign(respuestas, {
      "/admin/agent-templates": PLANTILLAS,
      "/admin/me": me,
      "/admin/agents/overview": { ...agentes, runtime: "legacy" },
    });
    await abrir();
    expect(screen.queryByRole("heading", { name: "¿Qué quieres que haga?" })).toBeNull();
    expect(screen.getByText(/solo agente, el General/)).toBeTruthy();
  });
});
