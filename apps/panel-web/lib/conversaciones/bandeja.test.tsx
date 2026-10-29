// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { violacionesGraves } from "@/lib/testing/axe";
import { RESPUESTAS, conversacionAbierta, conversaciones, leads } from "@/lib/testing/fixtures";
import type { LeadDetail } from "@/lib/api/types";
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

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

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
    // Al abrir el chat, el conteo de pendientes desaparece en este dispositivo.
    expect(within(actual).queryByText(/mensajes sin responder/)).toBeNull();
    expect(actual.getAttribute("href")).toBe("/conversaciones?c=test-conv-1");

    const otros = within(lista).getAllByRole("link").filter((enlace) => enlace !== actual);
    expect(within(otros[0]).queryByText(/mensajes sin responder/)).toBeNull();

    const chat = screen.getByRole("region", { name: "Conversación" });
    expect(within(chat).getByText("Usó 2 herramientas")).toBeTruthy();
    expect(within(chat).getByText(/1\.500 tokens/)).toBeTruthy();
    // Las notas internas viven en una modal que se abre desde la cabecera.
    fireEvent.click(within(chat).getByRole("button", { name: /Notas internas/ }));
    expect(screen.getByText("Cliente frecuente")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    // En el celular se vuelve a la lista.
    expect(within(chat).getByRole("link", { name: "Volver" }).getAttribute("href")).toBe("/conversaciones");

    // Filtro por conexión con las del negocio.
    expect(screen.getByRole("button", { name: /Conexión/ })).toBeTruthy();

    expect(await violacionesGraves(container)).toEqual([]);
  }, 15_000);



  it("el enlace de la ficha se queda en conversaciones y conserva el chat", async () => {
    await renderBandeja({ c: "test-conv-1" });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Más acciones de la conversación" }), {
      button: 0,
      ctrlKey: false,
      pointerType: "mouse",
    });
    await screen.findByRole("menu");
    const enlace = await screen.findByRole("menuitem", { name: /Ver ficha del cliente/ });
    const href = enlace.getAttribute("href") ?? "";
    expect(href.startsWith("/conversaciones?")).toBe(true);
    expect(href).toContain("c=test-conv-1");
    expect(href).toContain("cliente=test-lead-1");
  });

  it("abre la ficha del cliente dentro de conversaciones, sin salir a Clientes", async () => {
    const perfil = leads.items[0].perfil;
    const detalle: LeadDetail = {
      id: "test-lead-1",
      cliente: "Ana Prueba",
      nombre: "Ana",
      canal: "webchat",
      identificador: "webchat:test",
      telefono: perfil.phone ?? null,
      bot_paused: false,
      alta: null,
      conexiones: [],
      ultima_conversacion_id: "test-conv-1",
      datos: [],
      extras: {},
      columns: [],
      perfil,
      agentes: [],
      campos_perfil: [],
      editables: [],
    };
    respuestas["/admin/leads/test-lead-1"] = detalle;

    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = vi.fn(async (entrada: RequestInfo | URL) => {
      const url = String(entrada);
      if (url.includes("/timeline")) {
        return new Response(JSON.stringify({ items: [], next_cursor: null, partial: false }), {
          status: 200,
        });
      }
      if (url.includes("/consentimiento-datos")) {
        return new Response(
          JSON.stringify({ estado: "sin_aviso", aviso_activo: false, historial: [] }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    }) as unknown as typeof fetch;

    try {
      await renderBandeja({ c: "test-conv-1", cliente: "test-lead-1" });
      const ficha = screen.getByRole("dialog");
      expect(ficha).toBeTruthy();
      expect(within(ficha).getByText("Información general")).toBeTruthy();
      expect(within(ficha).getByText("Ana Prueba")).toBeTruthy();
    } finally {
      globalThis.fetch = fetchOriginal;
      delete respuestas["/admin/leads/test-lead-1"];
    }
  });

  it("sin chat abierto, cada fila con pendientes conserva su conteo", async () => {
    const conPendiente = {
      ...conversaciones,
      items: [conversaciones.items[0], { ...conversaciones.items[1], pending_count: 3 }],
    };
    respuestas["/admin/conversations"] = conPendiente;
    try {
      await renderBandeja({});
      const lista = screen.getByRole("navigation", { name: "Lista de conversaciones" });
      const enlaces = within(lista).getAllByRole("link");
      expect(within(enlaces[0]).getByText("2 mensajes sin responder")).toBeTruthy();
      expect(within(enlaces[1]).getByText("3 mensajes sin responder")).toBeTruthy();
    } finally {
      respuestas["/admin/conversations"] = conversaciones;
    }
  });

  it("escalada sin atender: se puede tomar y no hay caja de respuesta", async () => {
    await renderBandeja({ c: "test-conv-1" });
    expect(screen.getByRole("button", { name: "Tomar la conversación" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Devolver al agente" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Mensaje para el cliente" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Notas internas/ }));
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
      expect(screen.queryByRole("button", { name: "Tomar la conversación" })).toBeNull();
      expect(screen.getByRole("button", { name: "Devolver al agente" })).toBeTruthy();
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
