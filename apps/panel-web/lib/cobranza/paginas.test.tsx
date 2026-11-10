// @vitest-environment jsdom
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { FeedbackProviders } from "@/components/ui/providers";
import { fechaDeHoy } from "@/lib/cobranza/agenda";
import { violacionesGraves } from "@/lib/testing/axe";
import { resolverServidor } from "@/lib/testing/servidor";

const HOY = fechaDeHoy("America/Bogota");
const C = "/pack/cobranza";

const cartera = {
  id: "c1",
  nombre: "Ruta Centro",
  descripcion: null,
  gestor: "Pedro Gestor",
  tipo_interes: 20,
  num_cuotas: 24,
  moneda: "COP",
  estatus: "activo",
  clientes: 2,
  prestamos: 1,
  saldo: 100,
  mora: 10,
  cobrado_30d: 50,
  gastos_total: 5,
  reportes_diarios: [],
  caja: { saldo_inicial: 1, saldo_actual: 2, actualizado: "" },
  liquidaciones: [],
  inyecciones: [],
  gastos: [],
  estadisticas: [],
};

const RESPUESTAS: Record<string, unknown> = {
  [`${C}/portfolios/c1`]: cartera,
  [`${C}/portfolios/c1/config`]: { values: {} },
  [`${C}/portfolios/c1/route`]: {
    clientes: [
      { id: "k1", cliente: "Ana", saldo: 10, mora: 12, riesgo: "rojo" },
      { id: "k2", cliente: "Luis", saldo: 20, mora: 0, riesgo: "blanco" },
    ],
    plan: { orden: ["k2", "k1"], distancia_km: 14.2, tiempo_min: 95, fecha: HOY },
  },
  [`${C}/promises`]: [
    { id: "p-interno-1", cliente: "Ana", fecha_prometida: HOY, valor_prometido: 1000, estado: "pendiente", tipo: "promesa", creado_por: "ia", alcance: "vencido" },
    { id: "p-interno-2", cliente: "Luis", fecha_prometida: "2020-01-01", valor_prometido: 2000, estado: "pendiente", tipo: "promesa", creado_por: "gestor", alcance: null },
    { id: "p-interno-3", cliente: "Marta", fecha_prometida: "2020-01-01", valor_prometido: 3000, estado: "cumplida", tipo: "promesa", creado_por: "ia", alcance: null },
  ],
  [`${C}/clients/k1`]: {
    cliente: { id: "k1", nombre: "Ana", apellido: "Pérez", telefono: "", negocio: "", cartera: "Ruta Centro", cartera_id: "c1", tope_maximo_deuda: 0, color_riesgo: "rojo" },
    prestamos: [{ id: "p1", valor: 500, saldo: 250, num_cuotas: 1, tipo_interes: 20, fecha_otorgado: "2026-01-10", estatus: "vigente", cuotas: [{ id: "q1", numero: 1, valor: 50, vence: "2026-02-15", estatus: "atrasada" }] }],
    movimientos: [],
    cambios: [],
  },
};

vi.mock("@/lib/api/server", async (original) => ({
  ...(await original<typeof import("@/lib/api/server")>()),
  getBusinessTimezone: vi.fn(async () => "America/Bogota"),
  apiFetch: vi.fn(async (ruta: string) => {
    const data = RESPUESTAS[ruta.split("?")[0]];
    return data === undefined ? { ok: false, status: 500, error: "Falló" } : { ok: true, status: 200, data };
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn(), back: vi.fn() }),
  usePathname: () => "/cobranza",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

async function pintar(pagina: ReactNode) {
  return render(<FeedbackProviders>{await resolverServidor(pagina)}</FeedbackProviders>);
}

afterEach(cleanup);

describe("pantallas de Cobranza", () => {
  it("si una lista no carga, la cabecera sigue y se puede reintentar", async () => {
    const { default: Pagos } = await import("@/app/(app)/cobranza/pagos/page");
    await pintar(await Pagos());
    expect(screen.getByRole("heading", { level: 1, name: "Pagos de clientes" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("No se pudieron cargar los pagos");
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeTruthy();
  });

  it("la agenda agrupa las promesas y deja decidirlas de un toque", async () => {
    const { default: Promesas } = await import("@/app/(app)/cobranza/promesas/page");
    const { container } = await pintar(await Promesas({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { name: "Vencidas" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Hoy" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ana cumplió la promesa" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ana no cumplió la promesa" })).toBeTruthy();
    expect(screen.getByText("Cuotas vencidas · Pactó el agente")).toBeTruthy();
    expect(container.innerHTML).not.toContain("p-interno");
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("la ruta se lista en el orden del plan", async () => {
    const { default: Ruta } = await import("@/app/(app)/cobranza/carteras/[id]/(ficha)/ruta/page");
    const { container } = await pintar(await Ruta({ params: Promise.resolve({ id: "c1" }) }));
    const clientes = within(screen.getByRole("list", { name: "Clientes de la ruta" })).getAllByRole("listitem");
    expect(clientes.map((c) => c.textContent?.includes("Luis"))).toEqual([true, false]);
    expect(screen.getByText(/plan de hoy/)).toBeTruthy();
    expect(screen.getAllByText("Riesgo alto").length).toBeGreaterThan(0);
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("la ficha del cliente dice el riesgo con palabras y conserva el día del préstamo", async () => {
    const { default: Cliente } = await import("@/app/(app)/cobranza/carteras/[id]/clientes/[cid]/page");
    const { container } = await pintar(await Cliente({ params: Promise.resolve({ id: "c1", cid: "k1" }) }));
    expect(screen.getByText("Riesgo alto")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Préstamo del 10 de enero de 2026" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Cuota 1: .*Atrasada/ })).toBeTruthy();
    expect(await violacionesGraves(container)).toEqual([]);
  });

  it("una cartera activa se ve activa en su ficha", async () => {
    const { default: Layout } = await import("@/app/(app)/cobranza/carteras/[id]/(ficha)/layout");
    await pintar(await Layout({ children: null, params: Promise.resolve({ id: "c1" }) }));
    expect(screen.getByText("Activa")).toBeTruthy();
  });
});
