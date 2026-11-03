// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { ClientesDeModulo, consultaClientesDeModulo } from "@/components/domain/clientes-de-modulo";
import { FeedbackProviders } from "@/components/ui/providers";
import type { LeadsResponse } from "@/lib/api/types";
import { leads, me } from "@/lib/testing/fixtures";
import { resolverServidor } from "@/lib/testing/servidor";

// HU-CRM-24 (SPEC-33): vista «Embudo» de Ventas › Clientes: una consulta de contadores y sumas, una por
// columna con la etapa como filtro, filtros respetados, vacío de Clientes sin leads y lista si el backend
// no trae los contadores.

const llamadas: string[] = [];
let respuestaDeColumna: (etapa: string) => unknown;
let respuestaBase: unknown;
let permisos: "write" | "read" = "write";

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  getBusinessTimezone: vi.fn(async () => "America/Bogota"),
  apiFetch: vi.fn(async (ruta: string) => {
    llamadas.push(ruta);
    if (ruta.startsWith("/admin/me")) {
      return {
        ok: true,
        status: 200,
        data: { ...me, role: "collaborator", tenant: { ...me.tenant, role: "collaborator" }, permissions: { ...me.permissions, leads: permisos } },
      };
    }
    const etapa = new URL(ruta, "http://local").searchParams.getAll("filtro").find((f) => f.startsWith("estado_lead:"));
    const data = etapa && new URL(ruta, "http://local").searchParams.get("page_size") === "50"
      ? respuestaDeColumna(etapa.slice("estado_lead:".length))
      : respuestaBase;
    return { ok: true, status: 200, data };
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
  permisos = "write";
});

const ETAPAS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "calificado", label: "Calificado" },
  { value: "perdido", label: "Perdido" },
];
const FILTROS: LeadsResponse["filters"] = [
  { key: "estado_lead", label: "Estado del lead", options: ETAPAS },
  { key: "clasificacion", label: "Clasificación", options: [{ value: "fiel", label: "Fiel" }] },
  { key: "motivo_perdida", label: "Motivo de pérdida", options: [{ value: "precio", label: "Precio" }, { value: "sin_motivo", label: "Sin motivo registrado" }] },
];
const AGENTES: LeadsResponse["agents"] = [
  { key: "ventas", name: "Ventas", icon: "shopping-cart", columns: [{ key: "estado_lead", label: "Estado del lead" }] },
];
const FACETAS = (conSumas = true): NonNullable<LeadsResponse["facetas"]> => [
  {
    key: "estado_lead",
    counts: { nuevo: 120, calificado: 1, perdido: 0 },
    sin_valor: 3,
    total: 124,
    ...(conSumas ? { sumas: { nuevo: 1500000, calificado: 250000, perdido: 0, sin_valor: 0 } } : {}),
  },
];

const base = leads.items[0];
const fila = (id: string, nombre: string, etapa: string, extras: Record<string, unknown> = {}) => ({
  ...base,
  id,
  perfil: { ...base.perfil, nombre_visible: nombre },
  agentes: ["general", "ventas"],
  extras: { estado_lead: etapa, ...extras },
});

function responder({ conSumas = true, vacio = false } = {}) {
  respuestaBase = {
    ...leads,
    filters: FILTROS,
    agents: AGENTES,
    facetas: vacio
      ? [{ key: "estado_lead", counts: { nuevo: 0, calificado: 0, perdido: 0 }, sin_valor: 0, total: 0 }]
      : FACETAS(conSumas),
    items: [],
    total: 124,
    has_more: false,
  };
  respuestaDeColumna = (etapa) => ({
    ...(respuestaBase as object),
    items:
      vacio || etapa === "perdido"
        ? []
        : etapa === "nuevo"
          ? [fila("ana", "Ana Embudo", "Nuevo", { puntaje: 80, valor_estimado: 1500000, seguimiento_en: "2026-10-30T10:00:00+00:00", seguimiento_estado: "vencidos" })]
          : [fila("carla", "Carla Embudo", "Calificado")],
    total: etapa === "nuevo" ? 120 : 1,
    has_more: etapa === "nuevo",
  });
}

const OPERABLE = {
  etapa: "estado_lead",
  filtros: ["clasificacion", "motivo_perdida"],
  motivoDePerdida: "motivo_perdida",
  pluginDeEtapa: "pack_commerce",
};

async function pintar(sp: Parameters<typeof ClientesDeModulo>[0]["sp"] = {}) {
  const arbol = await resolverServidor(
    await ClientesDeModulo({
      agente: "ventas",
      basePath: "/comercio/clientes",
      titulo: "Clientes de Ventas",
      descripcion: "Descripción",
      sp,
      vacioDescripcion: "Cuando el agente atienda al primer cliente, aparecerá aquí.",
      operable: OPERABLE,
    }),
  );
  return render(<FeedbackProviders>{arbol}</FeedbackProviders>);
}

const consultas = () => llamadas.filter((l) => l.startsWith("/admin/leads")).map((l) => new URL(l, "http://local").searchParams);

describe("consultaClientesDeModulo en el embudo", () => {
  it("pide los contadores con las sumas de valor, una sola fila y sin la etapa de la URL", () => {
    const qs = consultaClientesDeModulo("ventas", { vista: "embudo", filtro: ["estado_lead:perdido", "clasificacion:fiel"], page: "3" }, OPERABLE);
    expect(qs.get("resumen")).toBe("valor");
    expect(qs.get("page_size")).toBe("1");
    expect(qs.has("page")).toBe(false);
    expect(qs.getAll("facetas")).toEqual(["estado_lead"]);
    expect(qs.getAll("filtro")).toEqual(["clasificacion:fiel"]);
  });

  it("sin la vista o sin quién escriba la etapa la consulta es la de la lista", () => {
    expect(consultaClientesDeModulo("ventas", { vista: "embudo" }, { etapa: "estado_lead" }).has("resumen")).toBe(false);
    expect(consultaClientesDeModulo("ventas", { page: "2" }, OPERABLE).has("resumen")).toBe(false);
    expect(consultaClientesDeModulo("ventas", { page: "2" }, OPERABLE).get("page")).toBe("2");
  });
});

describe("Ventas › Clientes › Embudo", () => {
  it("ofrece Lista y Embudo, marca Embudo y pinta una columna por etapa con cantidad y suma de los contadores", async () => {
    responder();
    await pintar({ vista: "embudo" });

    const vista = within(screen.getByRole("navigation", { name: "Vista de los clientes" }));
    expect(vista.getByRole("link", { name: "Embudo" }).getAttribute("aria-current")).toBe("page");
    expect(vista.getByRole("link", { name: "Lista" }).getAttribute("href")).toBe("/comercio/clientes");

    const nuevo = within(screen.getByRole("region", { name: "Nuevo" }));
    expect(nuevo.getByText("120")).toBeTruthy(); // el contador real, no las 50 tarjetas cargadas
    expect(nuevo.getAllByText(/1\.500\.000/).length).toBeGreaterThan(0);
    expect(nuevo.getByRole("link", { name: "Ana Embudo" })).toBeTruthy();
    expect(nuevo.getByText("Puntaje 80")).toBeTruthy();
    expect(nuevo.getByText("Seguimiento vencido")).toBeTruthy();
    expect(nuevo.getByText("Mostrando 1 de 120")).toBeTruthy();
    expect(within(screen.getByRole("region", { name: "Perdido" })).getByText("Sin clientes en esta etapa.")).toBeTruthy();
    // Las pestañas de etapa de la lista no se repiten: las columnas ya son las etapas.
    expect(screen.queryByRole("navigation", { name: /Clientes por estado/i })).toBeNull();
    expect(screen.getByText(/3 clientes aún no tienen lead de venta/)).toBeTruthy();
  });

  it("pide una página de 50 por etapa con la etapa como filtro, sin recargar todos los leads de golpe", async () => {
    responder();
    await pintar({ vista: "embudo", filtro: ["estado_lead:perdido", "clasificacion:fiel"], q: "ana" });

    const todas = consultas();
    expect(todas).toHaveLength(1 + ETAPAS.length);
    const [resumen, ...columnas] = todas;
    expect(resumen.get("resumen")).toBe("valor");
    expect(resumen.get("q")).toBe("ana");
    expect(columnas.map((c) => c.getAll("filtro").find((f) => f.startsWith("estado_lead:")))).toEqual([
      "estado_lead:nuevo",
      "estado_lead:calificado",
      "estado_lead:perdido",
    ]);
    for (const c of columnas) {
      expect(c.get("page_size")).toBe("50");
      expect(c.getAll("filtro").filter((f) => f.startsWith("estado_lead:"))).toHaveLength(1);
      expect(c.getAll("filtro")).toContain("clasificacion:fiel");
      expect(c.get("q")).toBe("ana");
    }
  });

  it("los filtros activos se conservan al cambiar de vista y el formulario manda la vista", async () => {
    responder();
    const { container } = await pintar({ vista: "embudo", filtro: ["clasificacion:fiel"], q: "ana" });

    const vista = within(screen.getByRole("navigation", { name: "Vista de los clientes" }));
    expect(vista.getByRole("link", { name: "Lista" }).getAttribute("href")).toBe(
      "/comercio/clientes?q=ana&filtro=clasificacion%3Afiel",
    );
    expect(container.querySelector('input[type="hidden"][name="vista"][value="embudo"]')).toBeTruthy();
    expect(screen.getByRole("link", { name: "Quitar el filtro Clasificación: Fiel" }).getAttribute("href")).toContain("vista=embudo");
  });

  it("en la lista ofrece Embudo, no consulta columnas y no manda la vista", async () => {
    responder();
    await pintar({});
    const vista = within(screen.getByRole("navigation", { name: "Vista de los clientes" }));
    expect(vista.getByRole("link", { name: "Lista" }).getAttribute("aria-current")).toBe("page");
    expect(vista.getByRole("link", { name: "Embudo" }).getAttribute("href")).toBe("/comercio/clientes?vista=embudo");
    expect(consultas()).toHaveLength(1);
    expect(consultas()[0].has("resumen")).toBe(false);
  });

  it("quien puede editar clientes ve «Mover a…» en cada tarjeta; con solo lectura ve las columnas y no puede moverlas", async () => {
    responder();
    await pintar({ vista: "embudo" });
    expect(screen.getByRole("button", { name: "Mover a Ana Embudo a otra etapa" })).toBeTruthy();
    cleanup();

    permisos = "read";
    responder();
    await pintar({ vista: "embudo" });
    expect(within(screen.getByRole("region", { name: "Nuevo" })).getByRole("link", { name: "Ana Embudo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Mover a/ })).toBeNull();
  });

  it("sin leads muestra el vacío de Clientes y no cinco columnas vacías", async () => {
    responder({ vacio: true });
    await pintar({ vista: "embudo" });
    expect(screen.getByText("Sin clientes todavía")).toBeTruthy();
    expect(screen.getByText("Cuando el agente atienda al primer cliente, aparecerá aquí.")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Nuevo" })).toBeNull();
  });

  it("sin las sumas del servidor (backend viejo) pinta las columnas con su cantidad y sin cifras de pesos", async () => {
    responder({ conSumas: false });
    await pintar({ vista: "embudo" });
    const calificado = within(screen.getByRole("region", { name: "Calificado" }));
    expect(calificado.getByText("1")).toBeTruthy();
    expect(calificado.queryByText(/\$/)).toBeNull();
  });

  it("sin contadores de etapa (backend viejo) cae en la lista y no ofrece el embudo", async () => {
    responder();
    respuestaBase = { ...(respuestaBase as object), facetas: [], items: [fila("ana", "Ana Embudo", "Nuevo")] };
    await pintar({ vista: "embudo" });
    expect(screen.queryByRole("navigation", { name: "Vista de los clientes" })).toBeNull();
    expect(screen.queryByRole("region", { name: "Nuevo" })).toBeNull();
    expect(screen.getAllByRole("link", { name: "Ana Embudo" }).length).toBeGreaterThan(0);
  });
});
