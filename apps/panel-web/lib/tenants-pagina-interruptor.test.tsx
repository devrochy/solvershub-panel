// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

const apiFetch = vi.fn();
vi.mock("@/lib/api/server", () => ({ apiFetch: (...a: unknown[]) => apiFetch(...a) }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/tenants",
  useSearchParams: () => new URLSearchParams(),
}));

import TenantsPage from "@/app/(app)/tenants/page";

const ID = "0b6f6d3e-6a43-4c39-9a52-4b6c1c1e2f10";
const OTRO = "9d1e1a5b-7c1f-4a51-8f0e-2b7d6f1e3c02";
const fila = (id: string, name: string, slug: string) => ({
  id,
  name,
  slug,
  status: "active",
  created_at: "2026-10-01T10:00:00Z",
  plan_name: "Básico",
  plan_status: "active",
  operational: true,
});
const LISTA = { items: [fila(ID, "Café Aurora", "cafe-aurora"), fila(OTRO, "Otro negocio", "otro")], page: 1, has_more: false, total: 2 };

function responder(rol: string) {
  apiFetch.mockImplementation(async (ruta: string) => {
    if (ruta.startsWith("/admin/platform/tenants")) return { ok: true, status: 200, data: LISTA };
    if (ruta === "/admin/plan") return { ok: true, status: 200, data: { plans: [] } };
    if (ruta === "/admin/me") return { ok: true, status: 200, data: { ...me, role: rol } };
    return { ok: false, status: 404, error: "sin fixture" };
  });
}

async function pintar(abrir?: string, negocio?: string) {
  const nodo = await TenantsPage({ searchParams: Promise.resolve({ ...(abrir ? { abrir } : {}), ...(negocio ? { negocio } : {}) }) });
  render(<FeedbackProviders>{await resolverServidor(nodo)}</FeedbackProviders>);
}

beforeEach(() => {
  apiFetch.mockReset();
  window.matchMedia ??= (() => ({ matches: false, addEventListener: () => undefined, removeEventListener: () => undefined })) as unknown as typeof window.matchMedia;
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ habilitada: false }), { status: 200 })));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("página de Tenants: el negocio en su cajón (PLT-01, PLT-02)", () => {
  it("el master que llega con ?abrir=<negocio> ve abierto el cajón de ese negocio con el interruptor", async () => {
    responder("master");
    await pintar(ID);
    expect(await screen.findByRole("dialog", { name: "Café Aurora" })).toBeTruthy();
    expect(screen.getByText(/cafe-aurora · creado el/)).toBeTruthy();
    expect(await screen.findByRole("switch", { name: "Plantillas con opciones" })).toBeTruthy();
  });

  it("?negocio= abre el cajón y las filas lo enlazan; sin parámetro queda cerrado", async () => {
    responder("master");
    await pintar();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getAllByRole("link", { name: "Abrir Café Aurora" })[0].getAttribute("href")).toBe(`/tenants?negocio=${ID}`);
    expect(screen.queryByRole("button", { name: "Filtrar" })).toBeNull();
    cleanup();
    await pintar(undefined, OTRO);
    expect(await screen.findByRole("dialog", { name: "Otro negocio" })).toBeTruthy();
  });

  it("un ?abrir que no es un uuid se ignora", async () => {
    responder("master");
    await pintar("../x");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("el tester con ?abrir no abre nada ni ve el interruptor; con ?negocio ve el cajón sin las funciones del master", async () => {
    responder("tester");
    await pintar(ID);
    expect(screen.queryByRole("dialog")).toBeNull();
    cleanup();
    await pintar(undefined, ID);
    expect(await screen.findByRole("dialog", { name: "Café Aurora" })).toBeTruthy();
    expect(screen.queryByRole("switch", { name: "Plantillas con opciones" })).toBeNull();
  });
});
