// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { AgentFilters } from "@/app/(app)/agentes/_components/agent-filters";
import { FeedbackProviders } from "@/components/ui/providers";
import type { PlanResponse } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";
import { conversaciones, leads, plan } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

import { enlaceDePago } from "./plan-limite";

// HU-UX-12 (SPEC-31): arreglos rápidos del panel que pidió el ciclo de pruebas del 2026-10-13.

const respuestas: Record<string, unknown> = {};

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    const data = respuestas[ruta.split("?")[0]];
    return data === undefined ? { ok: false, status: 404, error: "sin fixture" } : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

type Pagina = (props: { searchParams: Promise<Record<string, string>> }) => Promise<ReactNode>;

async function abrir(cargar: () => Promise<{ default: unknown }>, sp: Record<string, string> = {}) {
  const Pagina = (await cargar()).default as Pagina;
  const arbol = await resolverServidor(await Pagina({ searchParams: Promise.resolve(sp) }));
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

type Pago = PlanResponse["payments"][number];
const PAGO: Pago = {
  plan_id: "basic",
  amount_cop: 90_000,
  status: "pendiente",
  provider: "wompi",
  created_at: "2026-10-12T10:00:00Z",
  paid_at: null,
  checkout_url: "https://checkout.wompi.co/l/test-123",
  periodo: "2026-10",
};

describe("enlace para pagar un pago pendiente", () => {
  it("solo si está pendiente y trae un checkout https", () => {
    expect(enlaceDePago(PAGO)).toBe(PAGO.checkout_url);
    expect(enlaceDePago({ ...PAGO, status: "pending" })).toBe(PAGO.checkout_url);
    expect(enlaceDePago({ ...PAGO, status: "aprobado" })).toBeNull();
    expect(enlaceDePago({ ...PAGO, checkout_url: null })).toBeNull();
    expect(enlaceDePago({ ...PAGO, checkout_url: "javascript:alert(1)" })).toBeNull();
    expect(enlaceDePago({ ...PAGO, checkout_url: "no es url" })).toBeNull();
  });

  it("Plan muestra «Pagar» en la fila pendiente y no en la pagada", async () => {
    respuestas["/admin/plan"] = {
      ...plan,
      payments: [PAGO, { ...PAGO, status: "aprobado", paid_at: "2026-09-12T10:00:00Z", periodo: "2026-09" }],
    };
    const { container } = await abrir(() => import("@/app/(app)/plan/page"));
    const pagar = screen.getAllByRole("link", { name: /^Pagar/ });
    expect(pagar).toHaveLength(1);
    expect(pagar[0].getAttribute("href")).toBe(PAGO.checkout_url);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});

describe("listas que paginan en el servidor", () => {
  const muchos = Array.from({ length: 9 }, (_, i) => ({ ...leads.items[0], id: `test-lead-${i}`, canal: "whatsapp_cloud" }));

  it("Leads: solo Anterior/Siguiente del servidor y el canal con su nombre", async () => {
    respuestas["/admin/leads"] = { ...leads, items: muchos, total: 30, has_more: true, page: 2 };
    await abrir(() => import("@/app/(app)/leads/page"), { page: "2" });
    expect(screen.queryByRole("button", { name: "Página siguiente" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Buscar en la tabla" })).toBeNull();
    expect(screen.getByRole("link", { name: "Anterior" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Siguiente" })).toBeTruthy();
    const fila = screen.getAllByRole("row")[1];
    expect(within(fila).getByText("WhatsApp Cloud")).toBeTruthy();
    expect(screen.queryByText("whatsapp_cloud")).toBeNull();
  });

  it("Conversaciones: el canal con su nombre y sin flechas locales", async () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ ...conversaciones.items[0], id: `test-conv-${i}`, channel: "whatsapp_cloud" }));
    respuestas["/admin/conversations"] = { ...conversaciones, items, total: 9 };
    await abrir(() => import("@/app/(app)/conversaciones/page"));
    expect(screen.queryByRole("button", { name: "Página siguiente" })).toBeNull();
    // Bandeja (HU-UX-15): «canal · conexión» en cada chat, nunca el id crudo.
    expect(screen.getAllByText(/^WhatsApp Cloud/)).toHaveLength(9);
    expect(screen.queryByText(/whatsapp_cloud/)).toBeNull();
  });
});

describe("filtros de un agente", () => {
  it("el período sigue al valor de la URL al navegar en el cliente", () => {
    const props = { baseHref: "/agentes/general", tab: "conversaciones" as const, conexion: null, connections: [] };
    const { rerender } = render(<AgentFilters {...props} dias={7} />);
    const periodo = () => screen.getByRole("combobox", { name: "Período" }) as HTMLSelectElement;
    expect(periodo().value).toBe("7");
    // «Limpiar» vuelve a 30 días sin recargar: el Select se rehace con el valor nuevo.
    rerender(<AgentFilters {...props} dias={30} />);
    expect(periodo().value).toBe("30");
  });
});
