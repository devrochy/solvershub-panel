// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { ClientesDeModulo } from "@/components/domain/clientes-de-modulo";
import { FeedbackProviders } from "@/components/ui/providers";
import type { LeadsResponse } from "@/lib/api/types";
import { leads, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// HU-CRM-12 (SPEC-33, ADR-0179): la columna Agentes de Clientes y las listas de Ventas y Agenda.

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
  llamadas.length = 0;
  for (const k of Object.keys(respuestas)) delete respuestas[k];
});

const AGENTES: LeadsResponse["agents"] = [
  { key: "general", name: "General", icon: "bot", columns: [] },
  { key: "ventas", name: "Ventas", icon: "shopping-cart", columns: [{ key: "clasificacion", label: "Segmento" }, { key: "pedidos", label: "Pedidos" }] },
  { key: "agenda", name: "Agenda", icon: "calendar", columns: [{ key: "proxima_cita", label: "Próxima cita" }] },
];

const ANA = { ...leads.items[0], agentes: ["general", "ventas"], extras: { clasificacion: "fiel", pedidos: 3 } };

describe("columna Agentes de Clientes", () => {
  it("muestra General y solo los agentes con datos del cliente, sin atenuar ninguno", async () => {
    respuestas["/admin/leads"] = { ...leads, agents: AGENTES, items: [ANA] };
    respuestas["/admin/conversations/connections"] = [];
    respuestas["/admin/me"] = me;
    const Pagina = (await import("@/app/(app)/leads/page")).default as (p: {
      searchParams: Promise<Record<string, string>>;
    }) => Promise<ReactNode>;
    const arbol = await resolverServidor(await Pagina({ searchParams: Promise.resolve({}) }));
    const { container } = render(<FeedbackProviders>{arbol}</FeedbackProviders>);

    const fila = screen.getAllByRole("row")[1];
    expect(within(fila).getByRole("link", { name: "Abrir General de Ana Prueba" })).toBeTruthy();
    const ventas = within(fila).getByRole("link", { name: "Abrir Ventas de Ana Prueba" });
    expect(ventas.getAttribute("href")).toContain("agente=ventas");
    expect(within(fila).queryByRole("link", { name: /Abrir Agenda/ })).toBeNull();
    expect(container.querySelector(".opacity-35")).toBeNull();
  });
});

describe("ClientesDeModulo", () => {
  it("pide /admin/leads con el agente, pinta sus columnas y enlaza a la ficha", async () => {
    respuestas["/admin/leads"] = { ...leads, agents: AGENTES, items: [ANA] };
    const arbol = await resolverServidor(
      await ClientesDeModulo({
        agente: "ventas",
        basePath: "/comercio/clientes",
        titulo: "Clientes de Ventas",
        descripcion: "Descripción",
        sp: { q: " ana ", page: "2" },
        vacioDescripcion: "Vacío",
      }),
    );
    render(<FeedbackProviders>{arbol}</FeedbackProviders>);

    const pedida = new URL(llamadas[0], "http://local");
    expect(pedida.pathname).toBe("/admin/leads");
    expect(pedida.searchParams.get("agente")).toBe("ventas");
    expect(pedida.searchParams.get("q")).toBe("ana");
    expect(pedida.searchParams.get("page")).toBe("2");

    const cabeceras = screen.getAllByRole("columnheader").map((c) => c.textContent);
    expect(cabeceras).toEqual(expect.arrayContaining(["Segmento", "Pedidos"]));
    expect(cabeceras).not.toContain("Próxima cita");

    const fila = screen.getAllByRole("row")[1];
    expect(within(fila).getByText("fiel")).toBeTruthy();
    expect(within(fila).getByText("3")).toBeTruthy();
    const enlace = within(fila).getByRole("link", { name: "Ana Prueba" });
    expect(enlace.getAttribute("href")).toBe(`/leads?cliente=${ANA.id}&agente=ventas`);
  });
});
