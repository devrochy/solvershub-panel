// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { ClientesDeModulo, consultaClientesDeModulo } from "@/components/domain/clientes-de-modulo";
import { FeedbackProviders } from "@/components/ui/providers";
import type { LeadsResponse, Me } from "@/lib/api/types";
import { leads, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// HU-CRM-17 (SPEC-33): Ventas › Clientes operable. Pestañas por etapa con contador, filtros declarados por
// el pack, orden, chips, última actividad, acciones por fila, estados vacíos y tarjetas en móvil.

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

const ETAPAS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "calificado", label: "Calificado" },
  { value: "contactado", label: "Contactado" },
  { value: "convertido", label: "Convertido" },
  { value: "perdido", label: "Perdido" },
];
const FILTROS: LeadsResponse["filters"] = [
  { key: "estado_lead", label: "Estado del lead", options: ETAPAS },
  { key: "clasificacion", label: "Clasificación", options: [{ value: "fiel", label: "Fiel" }, { value: "nuevo", label: "Nuevo" }] },
];
const AGENTES: LeadsResponse["agents"] = [
  { key: "general", name: "General", icon: "bot", columns: [] },
  {
    key: "ventas",
    name: "Ventas",
    icon: "shopping-cart",
    columns: [
      { key: "estado_lead", label: "Estado del lead" },
      { key: "pedidos", label: "Pedidos" },
    ],
  },
];
const FACETAS: NonNullable<LeadsResponse["facetas"]> = [
  { key: "estado_lead", counts: { nuevo: 4, calificado: 2, contactado: 0, convertido: 1, perdido: 0 }, sin_valor: 3, total: 10 },
];

const base = leads.items[0];
const ANA = {
  ...base,
  id: "ana-id",
  agentes: ["general", "ventas"],
  ultima_actividad: new Date(Date.now() - 3 * 60_000).toISOString(),
  extras: { estado_lead: "Calificado", pedidos: 3 },
};
const SIN_TELEFONO = {
  ...base,
  id: "beto-id",
  cliente: "Beto",
  perfil: { ...base.perfil, nombre_visible: "Beto Sin Teléfono", phone: null, phone_e164: null, phone_indicativo: null, phone_local: null },
  agentes: ["general", "ventas"],
  ultima_actividad: null,
  extras: { estado_lead: null, pedidos: 0 },
};

const OPERABLE = { etapa: "estado_lead", filtros: ["clasificacion"] };

function responder(extra: Partial<LeadsResponse> = {}, yo: Me = me) {
  respuestas["/admin/leads"] = { ...leads, filters: FILTROS, facetas: FACETAS, agents: AGENTES, items: [ANA, SIN_TELEFONO], total: 2, ...extra };
  respuestas["/admin/me"] = yo;
}

async function pintar(sp: Parameters<typeof ClientesDeModulo>[0]["sp"] = {}, operable: typeof OPERABLE | null = OPERABLE) {
  const arbol = await resolverServidor(
    await ClientesDeModulo({
      agente: "ventas",
      basePath: "/comercio/clientes",
      titulo: "Clientes de Ventas",
      descripcion: "Descripción",
      sp,
      vacioDescripcion: "Cuando Ventas atienda al primer cliente aparecerá aquí.",
      operable: operable ?? undefined,
    }),
  );
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

describe("consultaClientesDeModulo", () => {
  it("sin operable solo lleva agente, búsqueda y página (Agenda no cambia)", () => {
    const qs = consultaClientesDeModulo("agenda", { q: " ana ", page: "2", filtro: "estado_lead:nuevo", orden: "nombre" });
    expect(qs.toString()).toBe("agente=agenda&q=ana&page=2");
  });

  it("operable suma filtros del pack, orden válido y los contadores de la etapa", () => {
    const qs = consultaClientesDeModulo("ventas", { filtro: ["estado_lead:nuevo", "x"], orden: "actividad" }, OPERABLE);
    expect(qs.getAll("filtro")).toEqual(["estado_lead:nuevo"]);
    expect(qs.get("orden")).toBe("actividad");
    expect(qs.get("facetas")).toBe("estado_lead");
  });

  it("descarta un orden desconocido y no manda el orden por defecto", () => {
    expect(consultaClientesDeModulo("ventas", { orden: "por-el-color" }, OPERABLE).has("orden")).toBe(false);
    expect(consultaClientesDeModulo("ventas", { orden: "alta" }, OPERABLE).has("orden")).toBe(false);
  });
});

describe("Ventas › Clientes operable", () => {
  it("muestra una pestaña por etapa con su contador, marca la actual y avisa de los sin lead", async () => {
    responder();
    await pintar({ filtro: "estado_lead:calificado", q: "ana" });

    const pedida = new URL(llamadas[0], "http://local");
    expect(pedida.searchParams.get("facetas")).toBe("estado_lead");
    expect(pedida.searchParams.getAll("filtro")).toEqual(["estado_lead:calificado"]);

    const pestanas = within(screen.getByRole("navigation", { name: /Clientes por estado del lead/i }));
    const todas = pestanas.getByRole("link", { name: /Todas/ });
    expect(todas.textContent).toContain("10");
    expect(pestanas.getByRole("link", { name: /Nuevo/ }).textContent).toContain("4");
    const actual = pestanas.getByRole("link", { name: /Calificado/ });
    expect(actual.getAttribute("aria-current")).toBe("page");
    expect(actual.textContent).toContain("2");
    // Cambiar de etapa conserva la búsqueda; «Todas» quita el filtro de etapa.
    expect(pestanas.getByRole("link", { name: /Nuevo/ }).getAttribute("href")).toBe("/comercio/clientes?q=ana&filtro=estado_lead%3Anuevo");
    expect(todas.getAttribute("href")).toBe("/comercio/clientes?q=ana");
    expect(screen.getByText(/3 clientes aún no tienen lead de venta/)).toBeTruthy();
  });

  it("pinta la etapa como texto, la última actividad y no repite la columna del pack", async () => {
    responder();
    await pintar();

    const cabeceras = screen.getAllByRole("columnheader").map((c) => c.textContent);
    expect(cabeceras).toEqual(expect.arrayContaining(["Cliente", "Etapa", "Última actividad", "Pedidos"]));
    expect(cabeceras).not.toContain("Estado del lead");

    const [, ana, beto] = screen.getAllByRole("row");
    expect(within(ana).getByText("Calificado")).toBeTruthy();
    expect(within(ana).getByText("Hace 3 min")).toBeTruthy();
    expect(within(beto).getByText("Sin lead de venta")).toBeTruthy();
    expect(within(beto).getByText("Sin mensajes")).toBeTruthy();
  });

  it("ofrece orden y el filtro de clasificación declarados por el pack, y conserva la etapa al filtrar", async () => {
    responder();
    const { container } = await pintar({ filtro: ["estado_lead:nuevo", "clasificacion:fiel"], orden: "nombre" });

    const orden = screen.getByLabelText("Ordenar por") as HTMLSelectElement;
    expect(orden.value).toBe("nombre");
    expect(within(orden).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Más nuevos primero",
      "Última actividad",
      "Nombre (A–Z)",
      "Nombre (Z–A)",
    ]);
    expect((screen.getByLabelText("Clasificación") as HTMLSelectElement).value).toBe("clasificacion:fiel");
    // La etapa vive en las pestañas: va en un campo oculto para no perderla al enviar el formulario.
    expect(container.querySelector('input[type="hidden"][name="filtro"]')?.getAttribute("value")).toBe("estado_lead:nuevo");
    expect(screen.queryByLabelText("Estado del lead")).toBeNull();
  });

  it("muestra los filtros activos como chips que se quitan uno a uno", async () => {
    responder();
    await pintar({ q: "ana", filtro: ["estado_lead:nuevo", "clasificacion:fiel"] });

    const chips = within(screen.getByRole("list", { name: "Filtros activos" }));
    expect(chips.getByText("Búsqueda: ana")).toBeTruthy();
    const etapa = chips.getByRole("link", { name: "Quitar el filtro Estado del lead: Nuevo" });
    expect(etapa.getAttribute("href")).toBe("/comercio/clientes?q=ana&filtro=clasificacion%3Afiel");
    const clasificacion = chips.getByRole("link", { name: "Quitar el filtro Clasificación: Fiel" });
    expect(clasificacion.getAttribute("href")).toBe("/comercio/clientes?q=ana&filtro=estado_lead%3Anuevo");
    expect(chips.getByRole("link", { name: "Quitar la búsqueda" }).getAttribute("href")).toBe(
      "/comercio/clientes?filtro=estado_lead%3Anuevo&filtro=clasificacion%3Afiel",
    );
    expect(screen.getByRole("link", { name: "Limpiar todo" }).getAttribute("href")).toBe("/comercio/clientes");
  });

  it("sin contadores del backend la etapa baja a un select y la lista sigue funcionando", async () => {
    responder({ facetas: [] });
    await pintar();

    expect(screen.queryByRole("navigation", { name: /Clientes por/ })).toBeNull();
    expect((screen.getByLabelText("Estado del lead") as HTMLSelectElement).value).toBe("");
    expect(screen.getAllByRole("row").length).toBe(3);
  });
});

describe("acciones por fila", () => {
  it("WhatsApp y Llamar salen del teléfono del cliente y se ocultan si no tiene", async () => {
    responder();
    await pintar();

    const [, ana, beto] = screen.getAllByRole("row");
    const wa = within(ana).getByRole("link", { name: "Escribir por WhatsApp a Ana Prueba" });
    expect(wa.getAttribute("href")).toBe("https://wa.me/573000000000");
    expect(wa.getAttribute("target")).toBe("_blank");
    expect(wa.getAttribute("rel")).toContain("noopener");
    expect(within(ana).getByRole("link", { name: "Llamar a Ana Prueba" }).getAttribute("href")).toBe("tel:+573000000000");
    expect(within(beto).queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    expect(within(beto).queryByRole("link", { name: /Llamar/ })).toBeNull();
    // La ficha sigue disponible aunque no haya teléfono.
    expect(within(beto).getByRole("link", { name: "Ver la ficha de Beto Sin Teléfono" })).toBeTruthy();
  });

  it("Enviar plantilla solo aparece para el propietario o la plataforma", async () => {
    responder();
    await pintar();
    expect(within(screen.getAllByRole("row")[1]).getByRole("button", { name: "Enviar plantilla a Ana Prueba" })).toBeTruthy();
    cleanup();

    responder({}, { ...me, role: "user", tenant: { ...me.tenant!, role: "colaborador" } } as Me);
    await pintar();
    expect(screen.queryByRole("button", { name: /Enviar plantilla/ })).toBeNull();
    // Escribir y llamar no dependen del permiso de envío masivo (una vez en la tabla y otra en la tarjeta móvil).
    expect(screen.getAllByRole("link", { name: "Llamar a Ana Prueba" }).length).toBe(2);
  });
});

describe("estados, CSV y móvil", () => {
  it("distingue «sin clientes» de «los filtros no encuentran a nadie»", async () => {
    responder({ items: [], total: 0, facetas: [{ ...FACETAS[0], total: 0, counts: {}, sin_valor: 0 }] });
    await pintar();
    expect(screen.getByText("Sin clientes todavía")).toBeTruthy();
    expect(screen.getByText("Cuando Ventas atienda al primer cliente aparecerá aquí.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Limpiar filtros" })).toBeNull();
    cleanup();

    responder({ items: [], total: 0 });
    await pintar({ filtro: "estado_lead:perdido" });
    expect(screen.getByText("Ningún cliente coincide")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Limpiar filtros" }).getAttribute("href")).toBe("/comercio/clientes");
  });

  it("un error de la API explica qué pasó y ofrece reintentar", async () => {
    respuestas["/admin/me"] = me;
    await pintar({ q: "ana" });
    expect(screen.getByRole("alert").textContent).toContain("No se pudieron cargar los clientes");
    expect(screen.getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/comercio/clientes?q=ana");
  });

  it("el CSV lleva el agente y los filtros, y avisa cuando pasa de 5000 clientes", async () => {
    responder({ total: 7320 });
    await pintar({ q: "ana", filtro: "estado_lead:nuevo" });

    const csv = screen.getByRole("link", { name: "Exportar CSV" });
    const url = new URL(csv.getAttribute("href")!, "http://local");
    expect(url.pathname).toBe("/api/leads/export");
    expect(url.searchParams.get("agente")).toBe("ventas");
    expect(url.searchParams.get("q")).toBe("ana");
    expect(url.searchParams.getAll("filtro")).toEqual(["estado_lead:nuevo"]);
    expect(screen.getByRole("status").textContent).toMatch(/5\.000 clientes más recientes de 7\.320/);
    cleanup();

    responder({ total: 120 });
    await pintar();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("en móvil cada cliente es una tarjeta con etapa, actividad y sus acciones", async () => {
    responder();
    await pintar();

    const tarjetas = within(screen.getByRole("list", { name: "Clientes de Ventas" })).getAllByRole("listitem");
    expect(tarjetas.length).toBe(2);
    const ana = within(tarjetas[0]);
    expect(ana.getByRole("link", { name: "Ana Prueba" })).toBeTruthy();
    expect(ana.getByText("Calificado")).toBeTruthy();
    expect(ana.getByText("Última actividad: Hace 3 min")).toBeTruthy();
    expect(ana.getByRole("link", { name: "Llamar a Ana Prueba" }).className).toContain("h-11");
    // Todos los destinos táctiles de la tarjeta miden 44 px (HIG: 44 × 44 pt).
    expect(ana.getByRole("link", { name: "Ver la ficha de Ana Prueba" }).className).toContain("h-11");
    expect(ana.getByRole("button", { name: "Enviar plantilla a Ana Prueba" }).className).toContain("h-11");
    expect(ana.getByRole("link", { name: "Ana Prueba" }).className).toContain("min-h-11");
    expect(within(tarjetas[1]).getByText("Sin lead de venta")).toBeTruthy();
  });

  it("Agenda no cambia: sin pestañas, orden, chips ni acciones nuevas", async () => {
    respuestas["/admin/leads"] = { ...leads, filters: FILTROS, agents: AGENTES, items: [ANA], total: 1 };
    await pintar({ q: "ana", filtro: "estado_lead:nuevo", orden: "nombre" }, null);

    const pedida = new URL(llamadas[0], "http://local");
    expect([...pedida.searchParams.keys()].sort()).toEqual(["agente", "q"]);
    expect(llamadas.some((l) => l.startsWith("/admin/me"))).toBe(false);
    expect(screen.queryByRole("navigation", { name: /Clientes por/ })).toBeNull();
    expect(screen.queryByLabelText("Ordenar por")).toBeNull();
    expect(screen.queryByRole("list", { name: "Filtros activos" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Exportar CSV" })).toBeNull();
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    expect(screen.getAllByRole("columnheader").map((c) => c.textContent)).not.toContain("Última actividad");
  });
});
