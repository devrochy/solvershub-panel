// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import type { QaDatos, QaEscenario, QaEscenarios, QaItem } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { DatosDePrueba } from "@/app/(app)/pruebas/_components/datos-de-prueba";

// Escenarios de datos de prueba (HU-QA-13): tarjetas, «Crear» / «Crear otro» y «Abrir».

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh, prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/pruebas/datos",
  useSearchParams: () => new URLSearchParams(),
}));

const NEGOCIO = "6f1c2a3b-1d4e-4f5a-9b6c-7d8e9f0a1b2c";

function escenario(slug: string, titulo: string, extra: Partial<QaEscenario> = {}): QaEscenario {
  return {
    slug,
    titulo,
    crea: `Lo que crea ${titulo}.`,
    requiere: "Tus datos preparados.",
    donde: "Campana",
    ruta: "/dashboard",
    agent_os: false,
    ultimo: null,
    ...extra,
  };
}

const ESCENARIOS: QaEscenarios = {
  datos_listos: true,
  escenarios: [
    escenario("notificaciones", "Notificaciones"),
    escenario("conversacion-con-turnos", "Conversación con turnos", {
      agent_os: true,
      ultimo: {
        sufijo: "A1B2C3",
        detalle: ["Conversación de «Ana Pérez · A1B2C3» en el chat web con 3 turnos"],
        conteos: { turnos: 3 },
        ruta: `/conversaciones/${NEGOCIO}`,
        creado_en: "2026-10-26T15:00:00Z",
      },
    }),
  ],
};

const DATOS = {
  estado: "listo",
  negocio: { id: NEGOCIO, slug: "qa-abc", nombre: "QA · ana" },
  cuentas: [],
  contenido: [],
} as unknown as QaDatos;

const GUIA = [
  { slug: "datos-wompi-sandbox", seccion: "datos", orden: 0, grupo: "Pagos", titulo: "Tarjeta de Wompi", estado: "guia" },
  { slug: "datos-escenario-notificaciones", seccion: "datos", orden: 1, grupo: "Escenarios", titulo: "Escenario «Notificaciones»", estado: "guia" },
] as QaItem[];

type Llamada = { url: string; method: string; body?: string };
let llamadas: Llamada[] = [];

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
  window.HTMLElement.prototype.scrollIntoView ??= () => undefined;
});

beforeEach(() => {
  llamadas = [];
  push.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      llamadas.push({ url, method: init?.method ?? "GET", body: typeof init?.body === "string" ? init.body : undefined });
      if (url === "/api/qa/datos/escenarios/notificaciones") {
        return Response.json(
          {
            ...escenario("notificaciones", "Notificaciones"),
            negocio_id: NEGOCIO,
            creado: {
              sufijo: "D4E5F6",
              detalle: ["5 avisos, uno por categoría: conversaciones, ventas, cobros, agenda y sistema"],
              conteos: { avisos: 5 },
              ruta: "/dashboard",
              creado_en: "2026-10-26T16:00:00Z",
            },
          },
          { status: 201 },
        );
      }
      if (url === "/api/qa/datos/escenarios/conversacion-con-turnos") {
        return Response.json({ error: "Tu negocio de prueba no tiene el Agent OS listo." }, { status: 409 });
      }
      if (url === "/api/tenant") return Response.json({ ok: true });
      return Response.json({ error: "no esperado" }, { status: 500 });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function montar(escenarios: QaEscenarios | null, datos: QaDatos | null = DATOS) {
  return render(
    <FeedbackProviders>
      <DatosDePrueba inicial={{ disponible: true, datos, contenido: [] }} guia={GUIA} escenarios={escenarios} />
    </FeedbackProviders>,
  );
}

describe("Escenarios de datos de prueba", () => {
  it("muestra una tarjeta por escenario con su ancla y saca los escenarios de la guía", async () => {
    const { container } = montar(ESCENARIOS);
    const lista = screen.getByRole("list", { name: "Escenarios de datos de prueba" });
    expect(within(lista).getAllByRole("article")).toHaveLength(2);
    expect(container.querySelector("#datos-escenario-notificaciones")).toBeTruthy();
    expect(screen.queryByText("Escenario «Notificaciones»")).toBeNull();
    expect(screen.getByText("Tarjeta de Wompi")).toBeTruthy();
    const tarjeta = screen.getByRole("article", { name: "Conversación con turnos" });
    expect(within(tarjeta).getByRole("button", { name: /Crear otro/ })).toBeTruthy();
    expect(within(tarjeta).getAllByText(/A1B2C3/).length).toBeGreaterThan(0);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("«Crear» crea un caso nuevo, muestra lo que creó y pasa a «Crear otro»", async () => {
    montar(ESCENARIOS);
    const tarjeta = screen.getByRole("article", { name: "Notificaciones" });
    fireEvent.click(within(tarjeta).getByRole("button", { name: /^Crear$/ }));
    await waitFor(() => expect(within(tarjeta).getByText(/5 avisos, uno por categoría/)).toBeTruthy());
    expect(llamadas).toEqual([{ url: "/api/qa/datos/escenarios/notificaciones", method: "POST", body: undefined }]);
    expect(within(tarjeta).getByRole("button", { name: /Crear otro/ })).toBeTruthy();
    expect(within(tarjeta).getByRole("button", { name: /Abrir/ })).toBeTruthy();
  });

  it("«Abrir» cambia al negocio de prueba y va a la ruta del escenario", async () => {
    montar(ESCENARIOS);
    const tarjeta = screen.getByRole("article", { name: "Conversación con turnos" });
    fireEvent.click(within(tarjeta).getByRole("button", { name: /Abrir/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/conversaciones/${NEGOCIO}`));
    expect(llamadas[0]).toEqual({ url: "/api/tenant", method: "POST", body: JSON.stringify({ tenantId: NEGOCIO }) });
  });

  it("un 409 muestra el motivo y no cambia la tarjeta", async () => {
    montar(ESCENARIOS);
    const tarjeta = screen.getByRole("article", { name: "Conversación con turnos" });
    fireEvent.click(within(tarjeta).getByRole("button", { name: /Crear otro/ }));
    expect(await screen.findByText(/no tiene el Agent OS listo/)).toBeTruthy();
    expect(within(tarjeta).getAllByText(/A1B2C3/).length).toBeGreaterThan(0);
  });

  it("sin datos preparados los botones quedan deshabilitados y lo explica", () => {
    montar({ ...ESCENARIOS, datos_listos: false }, null);
    expect(screen.getByText(/Prepara tus datos primero/)).toBeTruthy();
    const tarjeta = screen.getByRole("article", { name: "Notificaciones" });
    expect((within(tarjeta).getByRole("button", { name: /^Crear$/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(within(screen.getByRole("article", { name: "Conversación con turnos" })).queryByRole("button", { name: /Abrir/ })).toBeNull();
  });

  it("fuera de test (sin escenarios) no muestra la sección", () => {
    montar(null);
    expect(screen.queryByRole("heading", { name: "Escenarios" })).toBeNull();
  });
});
