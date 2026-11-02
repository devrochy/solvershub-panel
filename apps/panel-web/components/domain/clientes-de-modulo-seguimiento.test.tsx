// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { ClientesDeModulo, consultaClientesDeModulo } from "@/components/domain/clientes-de-modulo";
import { FeedbackProviders } from "@/components/ui/providers";
import type { LeadsResponse } from "@/lib/api/types";
import { leads, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// HU-CRM-21 (SPEC-33): seguimiento en Ventas › Clientes: pestañas con contador, columna «Vencido», orden
// «más atrasado» por defecto con el filtro y la hora en la zona del negocio.

const respuestas: Record<string, unknown> = {};
const llamadas: string[] = [];

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  getBusinessTimezone: vi.fn(async () => "America/Bogota"),
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

const ETAPAS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "calificado", label: "Calificado" },
];
const SEGUIMIENTO = [
  { value: "vencidos", label: "Vencidos" },
  { value: "hoy", label: "Hoy" },
  { value: "proximos_7_dias", label: "Próximos 7 días" },
  { value: "mas_adelante", label: "Más adelante" },
  { value: "sin_seguimiento", label: "Sin seguimiento" },
];
const FILTROS: LeadsResponse["filters"] = [
  { key: "estado_lead", label: "Estado del lead", options: ETAPAS },
  { key: "seguimiento", label: "Seguimiento", options: SEGUIMIENTO },
];
const AGENTES: LeadsResponse["agents"] = [
  { key: "general", name: "General", icon: "bot", columns: [] },
  {
    key: "ventas",
    name: "Ventas",
    icon: "shopping-cart",
    columns: [
      { key: "estado_lead", label: "Estado del lead" },
      { key: "seguimiento_nota", label: "Próxima acción" },
      { key: "pedidos", label: "Pedidos" },
    ],
  },
];
const FACETAS: NonNullable<LeadsResponse["facetas"]> = [
  { key: "estado_lead", counts: { nuevo: 4, calificado: 2 }, sin_valor: 0, total: 6 },
  { key: "seguimiento", counts: { vencidos: 2, hoy: 1, proximos_7_dias: 0, mas_adelante: 1, sin_seguimiento: 2 }, sin_valor: 0, total: 6 },
];

const base = leads.items[0];
const VENCIDO = {
  ...base,
  id: "ana-id",
  agentes: ["general", "ventas"],
  extras: {
    estado_lead: "Calificado",
    seguimiento_en: "2026-11-03T04:30:00+00:00", // lunes 2, 23:30 en Bogotá
    seguimiento_nota: "Enviar cotización",
    seguimiento_estado: "vencidos",
    pedidos: 1,
  },
};
const SIN_SEGUIMIENTO = {
  ...base,
  id: "beto-id",
  cliente: "Beto",
  perfil: { ...base.perfil, nombre_visible: "Beto Sin Seguimiento" },
  agentes: ["general", "ventas"],
  extras: { estado_lead: "Nuevo", seguimiento_en: null, seguimiento_nota: null, seguimiento_estado: null, pedidos: 0 },
};

const OPERABLE = { etapa: "estado_lead", filtros: [] as string[], seguimiento: "seguimiento" };

function responder() {
  respuestas["/admin/leads"] = { ...leads, filters: FILTROS, facetas: FACETAS, agents: AGENTES, items: [VENCIDO, SIN_SEGUIMIENTO], total: 2 };
  respuestas["/admin/me"] = me;
}

async function pintar(sp: Parameters<typeof ClientesDeModulo>[0]["sp"] = {}) {
  const arbol = await resolverServidor(
    await ClientesDeModulo({
      agente: "ventas",
      basePath: "/comercio/clientes",
      titulo: "Clientes de Ventas",
      descripcion: "Descripción",
      sp,
      vacioDescripcion: "Vacío",
      operable: OPERABLE,
    }),
  );
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

describe("consultaClientesDeModulo con seguimiento", () => {
  it("pide los contadores de la etapa y del seguimiento", () => {
    expect(consultaClientesDeModulo("ventas", {}, OPERABLE).getAll("facetas")).toEqual(["estado_lead", "seguimiento"]);
  });

  it("con un filtro de seguimiento y sin orden elegido, los más atrasados primero", () => {
    expect(consultaClientesDeModulo("ventas", { filtro: "seguimiento:vencidos" }, OPERABLE).get("orden")).toBe("seguimiento");
  });

  it("respeta el orden elegido y no ordena por seguimiento sin filtro ni con «sin seguimiento»", () => {
    expect(consultaClientesDeModulo("ventas", { filtro: "seguimiento:vencidos", orden: "nombre" }, OPERABLE).get("orden")).toBe("nombre");
    expect(consultaClientesDeModulo("ventas", {}, OPERABLE).has("orden")).toBe(false);
    expect(consultaClientesDeModulo("ventas", { filtro: "seguimiento:sin_seguimiento" }, OPERABLE).has("orden")).toBe(false);
  });

  it("sin la clave de seguimiento la consulta no cambia (Agenda y Ventas viejo)", () => {
    const qs = consultaClientesDeModulo("ventas", { filtro: "seguimiento:vencidos" }, { etapa: "estado_lead" });
    expect(qs.getAll("facetas")).toEqual(["estado_lead"]);
    expect(qs.has("orden")).toBe(false);
  });
});

describe("Ventas › Clientes con seguimiento", () => {
  it("muestra pestañas con contador, marca la actual y conserva los otros filtros al cambiar", async () => {
    responder();
    await pintar({ filtro: ["seguimiento:vencidos", "estado_lead:calificado"] });

    const pestanas = within(screen.getByRole("navigation", { name: /Clientes por seguimiento/i }));
    expect(pestanas.getByRole("link", { name: /Todas/ }).textContent).toContain("6");
    const actual = pestanas.getByRole("link", { name: /Vencidos/ });
    expect(actual.getAttribute("aria-current")).toBe("page");
    expect(actual.textContent).toContain("2");
    expect(pestanas.getByRole("link", { name: /Hoy/ }).getAttribute("href")).toBe(
      "/comercio/clientes?filtro=estado_lead%3Acalificado&filtro=seguimiento%3Ahoy",
    );
    expect(pestanas.getByRole("link", { name: /Todas/ }).getAttribute("href")).toBe(
      "/comercio/clientes?filtro=estado_lead%3Acalificado",
    );
  });

  it("marca el vencido con texto, la fecha en hora de Bogotá y la nota; el que no tiene dice «Sin seguimiento»", async () => {
    responder();
    await pintar();

    const cabeceras = screen.getAllByRole("columnheader").map((c) => c.textContent);
    expect(cabeceras).toEqual(expect.arrayContaining(["Seguimiento", "Pedidos"]));
    expect(cabeceras).not.toContain("Próxima acción"); // la nota va dentro de la columna de seguimiento

    const [, ana, beto] = screen.getAllByRole("row");
    expect(within(ana).getByText("Vencido")).toBeTruthy();
    expect(within(ana).getByText(/11:30/)).toBeTruthy();
    expect(within(ana).getByText("Enviar cotización")).toBeTruthy();
    expect(within(beto).getByText("Sin seguimiento")).toBeTruthy();
  });

  it("ofrece el orden por seguimiento y lo preselecciona con el filtro; la pestaña actual va en un campo oculto", async () => {
    responder();
    const { container } = await pintar({ filtro: "seguimiento:vencidos" });

    expect(new URL(llamadas[0], "http://local").searchParams.get("orden")).toBe("seguimiento");
    const orden = screen.getByLabelText("Ordenar por") as HTMLSelectElement;
    expect(orden.value).toBe("seguimiento");
    expect(within(orden).getAllByRole("option").map((o) => o.textContent)).toContain("Seguimiento (más atrasado)");
    expect(container.querySelector('input[type="hidden"][name="filtro"][value="seguimiento:vencidos"]')).toBeTruthy();
  });

  it("sin el filtro en el backend (versión vieja) no hay pestañas ni orden extra, y la columna dice «Sin seguimiento»", async () => {
    responder();
    respuestas["/admin/leads"] = {
      ...(respuestas["/admin/leads"] as object),
      filters: FILTROS.filter((f) => f.key !== "seguimiento"),
      facetas: FACETAS.filter((f) => f.key !== "seguimiento"),
    };
    await pintar();
    expect(screen.queryByRole("navigation", { name: /seguimiento/i })).toBeNull();
    const orden = screen.getByLabelText("Ordenar por") as HTMLSelectElement;
    expect(within(orden).getAllByRole("option").map((o) => o.textContent)).not.toContain("Seguimiento (más atrasado)");
  });
});
