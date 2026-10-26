// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { Evaluation, ReleaseSummary } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";
import { consolaConexiones, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Versiones de una conexión (HU-AOS-27): la activa con «Volver a la versión», la candidata con el
// estado de sus pruebas, y las acciones solo para quien puede usarlas.

const CONEXION = "00000000-0000-4000-8000-0000000000c1";
const respuestas: Record<string, unknown> = {};

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
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
  usePathname: () => `/conexiones/${CONEXION}/versiones`,
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
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

function version(n: number, extra: Partial<ReleaseSummary> = {}): ReleaseSummary {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, number: n, origin: "owner", manifest_hash: "a".repeat(64),
    created_at: "2026-10-25T12:00:00Z", active: false, canary: false, last_event: null, last_event_at: null,
    lifecycle: null, detenida: false, ...extra,
  };
}

const VERSIONES = [
  version(4, { origin: "platform" }),
  version(3, { active: true, lifecycle: "promoted" }),
  version(2, { lifecycle: "promoted" }),
];

const consola = {
  ...consolaConexiones,
  runtime: "v3",
  items: [{ ...consolaConexiones.items[0], id: CONEXION, label: "WhatsApp principal" }],
};

async function abrir(extra: Record<string, unknown> = {}, medicion: Evaluation | null = null) {
  Object.assign(
    respuestas,
    {
      [`/admin/connections/${CONEXION}/releases`]: VERSIONES,
      "/admin/connections/console": consola,
      "/admin/me": me,
      ...(medicion ? { [`/admin/connections/${CONEXION}/releases/${VERSIONES[0].id}/evaluation`]: medicion } : {}),
    },
    extra,
  );
  const Pagina = (await import("@/app/(app)/conexiones/[id]/versiones/page")).default as (p: {
    params: Promise<{ id: string }>;
  }) => Promise<ReactNode>;
  const arbol = await resolverServidor(await Pagina({ params: Promise.resolve({ id: CONEXION }) }));
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

describe("versiones de la conexión", () => {
  it("muestra la activa con volver atrás, la candidata de la plataforma con su aviso y es accesible", async () => {
    const { container } = await abrir();
    expect(screen.getByRole("heading", { level: 1, name: "Versiones de WhatsApp principal" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Volver a la versión 2" })).toBeTruthy();
    expect(screen.getByText(/SolversHub preparó esta versión/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publicar a todos" })).toBeTruthy();
    expect(screen.getByText(/no tiene pruebas automáticas/)).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("con el gate cerrado y sin medir, no deja publicar y ofrece medir", async () => {
    await abrir({}, { gate_cerrado: true, base_release_id: null, es_la_activa: false, veredicto: null, medicion: null });
    expect(screen.queryByRole("button", { name: "Publicar a todos" })).toBeNull();
    expect(screen.getByRole("button", { name: "Medir ahora" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/medirla/);
  });

  it("sin permiso no muestra acciones (nunca un 403 por diseño)", async () => {
    await abrir({ "/admin/me": { ...me, role: "colaborador", tenant: { ...me.tenant, role: "member" } } });
    for (const nombre of ["Publicar a todos", "Detener", "Volver a la versión 2"]) {
      expect(screen.queryByRole("button", { name: nombre })).toBeNull();
    }
    expect(screen.getAllByRole("button", { name: /Ver diferencias/ }).length).toBeGreaterThan(0);
  });

  it("ver diferencias trae el diff y lo explica", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          candidata: 4, base: 3, sin_linea_base: false,
          agentes: [
            {
              key: "agenda", nombre: "Agenda", rol: "specialist", cambio: "nuevo", version_antes: null, version_ahora: 1,
              secciones: [], herramientas_agregadas: [], herramientas_quitadas: [], procedimientos_agregados: [], procedimientos_quitados: [],
            },
          ],
          superpoderes: { habilidades: [], plugins_agregados: [], plugins_quitados: [] },
          permisos: [], otros: { ajustes: [], playbooks: [], flujo: false },
          medira: [{ procedure_id: "pack_calendar.agendar_cita", titulo: "Agendar una cita", motivo: "agente_nuevo:agenda" }],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    await abrir();
    fireEvent.click(screen.getAllByRole("button", { name: /Ver diferencias/ })[0]);
    expect(await screen.findByText("Agenda: agente nuevo.")).toBeTruthy();
    expect(screen.getByText(/Agendar una cita/)).toBeTruthy();
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(`/api/connections/${CONEXION}/versiones/${VERSIONES[0].id}/diferencias`);
  });
});
