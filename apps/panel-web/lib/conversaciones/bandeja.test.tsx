// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { violacionesGraves } from "@/lib/testing/axe";
import { RESPUESTAS, conversacionAbierta, conversaciones } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// Bandeja de conversaciones (HU-UX-15): la página con un chat abierto (`?c=`).

const respuestas: Record<string, unknown> = { ...RESPUESTAS };

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  apiFetch: vi.fn(async (ruta: string) => {
    const data = respuestas[ruta.split("?")[0]];
    return data === undefined
      ? { ok: false, status: 404, error: `Sin fixture para ${ruta}` }
      : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined, getAll: () => [], has: () => false }),
  headers: async () => new Headers(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/conversaciones",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

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

afterEach(cleanup);

async function renderBandeja(searchParams: Record<string, string>) {
  const { default: Pagina } = await import("@/app/(app)/conversaciones/page");
  const arbol = await resolverServidor(await Pagina({ searchParams: Promise.resolve(searchParams) }));
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

describe("bandeja de conversaciones", () => {
  it("dos columnas: lista con conexión y último mensaje, y el hilo con herramientas y costo", async () => {
    const { container } = await renderBandeja({ c: "test-conv-1" });

    const lista = screen.getByRole("navigation", { name: "Lista de conversaciones" });
    const actual = within(lista).getByRole("link", { current: true });
    expect(actual.textContent).toContain("Ana Prueba");
    expect(actual.textContent).toContain("Quiero hablar con alguien");
    expect(actual.textContent).toContain("WhatsApp · Ventas");
    expect(within(actual).getByText("2 mensajes sin responder")).toBeTruthy();
    expect(actual.getAttribute("href")).toBe("/conversaciones?c=test-conv-1");

    const otros = within(lista).getAllByRole("link").filter((enlace) => enlace !== actual);
    expect(within(otros[0]).queryByText(/mensajes sin responder/)).toBeNull();

    const chat = screen.getByRole("region", { name: "Conversación" });
    expect(within(chat).getByText("Usó 2 herramientas")).toBeTruthy();
    expect(within(chat).getByText(/1\.500 tokens/)).toBeTruthy();
    expect(within(chat).getByText("Cliente frecuente")).toBeTruthy();
    // En el celular se vuelve a la lista.
    expect(within(chat).getByRole("link", { name: "Volver" }).getAttribute("href")).toBe("/conversaciones");

    // Filtro por conexión con las del negocio.
    expect(screen.getByRole("combobox", { name: "Conexión" })).toBeTruthy();

    expect(await violacionesGraves(container)).toEqual([]);
  }, 15_000);

  it("escalada sin atender: se puede tomar y no hay caja de respuesta", async () => {
    await renderBandeja({ c: "test-conv-1" });
    expect(screen.getByRole("button", { name: "Tomar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Devolver al agente" })).toBeTruthy();
    expect(screen.queryByRole("textbox", { name: "Mensaje para el cliente" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Nota interna" })).toBeTruthy();
  });

  it("mientras una persona atiende aparece la caja de respuesta", async () => {
    respuestas["/admin/conversations/test-conv-1"] = {
      ...conversacionAbierta,
      escalation: { ...conversacionAbierta.escalation!, status: "asignada", assigned_admin_email: "ana@negocio.co" },
    };
    try {
      await renderBandeja({ c: "test-conv-1" });
      expect(screen.getByText("La atiende ana@negocio.co")).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Tomar" })).toBeNull();
      expect(screen.getByRole("textbox", { name: "Mensaje para el cliente" })).toBeTruthy();
    } finally {
      respuestas["/admin/conversations/test-conv-1"] = conversacionAbierta;
    }
  });

  it("ordena por llegada aunque el servidor mande la lista al revés", async () => {
    respuestas["/admin/conversations"] = { ...conversaciones, items: [...conversaciones.items].reverse() };
    try {
      await renderBandeja({});
      const lista = screen.getByRole("navigation", { name: "Lista de conversaciones" });
      const enlaces = within(lista).getAllByRole("link");
      expect(enlaces[0].textContent).toContain("Ana Prueba");
      expect(enlaces[1].textContent).toContain("573000000002");
    } finally {
      respuestas["/admin/conversations"] = conversaciones;
    }
  });

  it("sin chat elegido invita a elegir uno", async () => {
    const { container } = await renderBandeja({});
    expect(screen.getByText("Elige una conversación")).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  }, 15_000);
});
