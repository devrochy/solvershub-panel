// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { LeadDetail, Me, Order } from "@/lib/api/types";
import { escalaciones, leads, me as sesionDueno } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// HU-CRM-20: Pedidos y Escalaciones enlazan a la ficha del cliente solo si la sesión ve Clientes.

const respuestas: Record<string, { data: unknown; total?: number }> = {};
const llamadas: string[] = [];

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  getBusinessCurrency: async () => "COP",
  apiFetch: vi.fn(async (ruta: string) => {
    llamadas.push(ruta);
    const r = respuestas[ruta.split("?")[0]];
    return r === undefined ? { ok: false, status: 404, error: "sin fixture" } : { ok: true, status: 200, ...r };
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/comercio/pedidos",
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

const PEDIDO: Order = {
  id: "ped-1",
  public_order_number: "OC-0007",
  customer_id: "cli-1",
  customer_name: "Ana Prueba",
  total: 50000,
  status: "despachado",
  payment_status: "pagado",
  payment_method: "transferencia",
  delivery_method: "domicilio",
  delivery_full_name: "Ana P.",
  delivery_address: "Calle 1",
  created_at: "2026-10-20T10:00:00Z",
  line_items: [{ name: "Camisa", quantity: 1, unit_price: 50000 }],
};

const SIN_CLIENTES: Me = { ...sesionDueno, permissions: { pack_commerce: "write", escalations: "write" } };

type Pagina = (p: { searchParams: Promise<Record<string, string>> }) => Promise<ReactNode>;

async function pintar(pagina: Pagina, sp: Record<string, string> = {}) {
  const arbol = await resolverServidor(await pagina({ searchParams: Promise.resolve(sp) }));
  render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

describe("/comercio/pedidos", () => {
  const pedidos = async () => (await import("@/app/(app)/comercio/pedidos/page")).default as unknown as Pagina;

  it("el nombre del cliente abre su ficha en la pestaña Ventas", async () => {
    respuestas["/pack/commerce/orders"] = { data: [PEDIDO], total: 1 };
    respuestas["/admin/me"] = { data: sesionDueno };
    await pintar(await pedidos());

    const enlace = screen.getByRole("link", { name: "Ana Prueba" });
    expect(enlace.getAttribute("href")).toBe("/leads?cliente=cli-1&agente=ventas");
  });

  it("sin acceso a Clientes el nombre no es un enlace", async () => {
    respuestas["/pack/commerce/orders"] = { data: [PEDIDO], total: 1 };
    respuestas["/admin/me"] = { data: SIN_CLIENTES };
    await pintar(await pedidos());

    expect(screen.getByText("Ana Prueba")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ana Prueba" })).toBeNull();
  });

  it("pide al backend los filtros y la página, y escribe los estados en español", async () => {
    respuestas["/pack/commerce/orders"] = { data: [PEDIDO], total: 60 };
    respuestas["/admin/me"] = { data: sesionDueno };
    await pintar(await pedidos(), { estado: "despachado", q: "OC-0007", page: "2" });

    const consulta = new URLSearchParams(llamadas.find((l) => l.startsWith("/pack/commerce/orders"))!.split("?")[1]);
    expect(consulta.get("estado")).toBe("despachado");
    expect(consulta.get("q")).toBe("OC-0007");
    expect(consulta.get("limit")).toBe("25");
    expect(consulta.get("offset")).toBe("25");
    const estado = screen.getByLabelText("Estado del pedido ped-1") as HTMLSelectElement;
    expect(within(estado).getByRole("option", { name: "Despachado" })).toBeTruthy();
    expect(within(estado).queryByRole("option", { name: "despachado" })).toBeNull();
    // 60 pedidos en total y esta es la página 2 de 25: hay anterior y siguiente.
    expect(screen.getByText(/60 pedidos · página 2/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Siguiente" }).getAttribute("href")).toContain("page=3");
  });

  it("filtrado por cliente muestra un chip que lo quita", async () => {
    respuestas["/pack/commerce/orders"] = { data: [PEDIDO], total: 1 };
    respuestas["/admin/me"] = { data: sesionDueno };
    await pintar(await pedidos(), { cliente: "cli-1", estado: "despachado" });

    const consulta = new URLSearchParams(llamadas.find((l) => l.startsWith("/pack/commerce/orders"))!.split("?")[1]);
    expect(consulta.get("customer_id")).toBe("cli-1");
    const chip = screen.getByRole("link", { name: /Quitar el filtro de cliente Ana Prueba/ });
    expect(chip.getAttribute("href")).toBe("/comercio/pedidos?estado=despachado");
  });
});

describe("/escalaciones", () => {
  const pagina = async () => (await import("@/app/(app)/escalaciones/page")).default as unknown as Pagina;

  it("el nombre abre la ficha y «Ver» sigue abriendo la conversación", async () => {
    respuestas["/admin/escalations"] = { data: escalaciones };
    respuestas["/admin/me"] = { data: sesionDueno };
    await pintar(await pagina());

    const fila = screen.getAllByRole("row")[1];
    expect(within(fila).getByRole("link", { name: "Ana Prueba" }).getAttribute("href")).toBe("/leads?cliente=test-cliente-1");
    expect(within(fila).getByRole("link", { name: "Ver" }).getAttribute("href")).toBe("/conversaciones?c=test-conv-1");
  });

  it("sin acceso a Clientes el nombre no es un enlace pero «Ver» sí", async () => {
    respuestas["/admin/escalations"] = { data: escalaciones };
    respuestas["/admin/me"] = { data: SIN_CLIENTES };
    await pintar(await pagina());

    const fila = screen.getAllByRole("row")[1];
    expect(within(fila).queryByRole("link", { name: "Ana Prueba" })).toBeNull();
    expect(within(fila).getByText("Ana Prueba")).toBeTruthy();
    expect(within(fila).getByRole("link", { name: "Ver" })).toBeTruthy();
  });
});

describe("ficha del cliente", () => {
  it("la pestaña Ventas lleva a los pedidos de ESE cliente", async () => {
    const perfil = leads.items[0].perfil;
    const detalle: LeadDetail = {
      id: "cli-1",
      cliente: "Ana Prueba",
      nombre: "Ana",
      canal: "webchat",
      identificador: "webchat:test",
      telefono: perfil.phone ?? null,
      bot_paused: false,
      alta: null,
      conexiones: [],
      ultima_conversacion_id: null,
      datos: [],
      extras: {},
      columns: [],
      perfil,
      agentes: [
        { key: "ventas", name: "Ventas", columns: [{ key: "pedidos", label: "Pedidos", value: 3 }], editables: [] },
        { key: "cobranza", name: "Cobranza", columns: [{ key: "saldo", label: "Saldo", value: 10 }], editables: [] },
      ],
      campos_perfil: [],
      editables: [],
    };
    respuestas["/admin/leads"] = { data: leads };
    respuestas["/admin/conversations/connections"] = { data: [] };
    respuestas["/admin/me"] = { data: sesionDueno };
    respuestas["/admin/leads/cli-1"] = { data: detalle };
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = vi.fn(
      async () => new Response(JSON.stringify({ items: [], next_cursor: null, partial: false }), { status: 200 }),
    ) as unknown as typeof fetch;
    try {
      const Leads = (await import("@/app/(app)/leads/page")).default as unknown as Pagina;
      await pintar(Leads, { cliente: "cli-1", agente: "ventas" });
    } finally {
      globalThis.fetch = fetchOriginal;
    }

    const enlace = screen.getByRole("link", { name: "Ver sus pedidos" });
    expect(enlace.getAttribute("href")).toBe("/comercio/pedidos?cliente=cli-1");
    expect(screen.queryByRole("link", { name: "Abrir en Ventas" })).toBeNull();
  });
});
