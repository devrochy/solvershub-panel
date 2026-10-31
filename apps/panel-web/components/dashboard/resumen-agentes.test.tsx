// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import type { KpiResumen, PuntoActividad, ResumenPorAgente } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { ResumenAgentes } from "./resumen-agentes";

afterEach(cleanup);

function k(parcial: Partial<KpiResumen> & Pick<KpiResumen, "id" | "label">): KpiResumen {
  return { valor: 0, unidad: "count", previo: null, delta_pct: null, polaridad: "up-good", ...parcial };
}

const DIAS = ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25", "2026-10-26", "2026-10-27"];
const serie = (turnos: number[]): PuntoActividad[] =>
  DIAS.map((fecha, i) => ({ fecha, turnos: turnos[i], conversaciones: Math.ceil(turnos[i] / 2), costo: turnos[i] * 0.01 }));

const PERIODO = {
  desde: "2026-10-20T00:00:00Z",
  hasta: "2026-10-27T00:00:00Z",
  previo_desde: "2026-10-13T00:00:00Z",
  previo_hasta: "2026-10-20T00:00:00Z",
  dias: 7,
};

const DATOS: ResumenPorAgente = {
  periodo: PERIODO,
  runtime: "v3",
  general: {
    kpis: [
      k({ id: "conversaciones", label: "Conversaciones", valor: 40, previo: 20, delta_pct: 100, destino: { ruta: "conversaciones", params: {} } }),
      k({ id: "escalaciones_pendientes", label: "Escalaciones pendientes", valor: 2, polaridad: "up-bad", destino: { ruta: "escalaciones", params: {} } }),
    ],
  },
  agentes: [
    {
      ref: "id-ventas",
      key: "ventas",
      name: "Ventas",
      kind: "specialist",
      kpis: [
        k({ id: "turnos", label: "Turnos atendidos", valor: 60, previo: 40, delta_pct: 50, destino: { ruta: "agente", params: { ref: "id-ventas", pestana: "conversaciones" } } }),
        k({ id: "tareas_abiertas", label: "Tareas abiertas", valor: 3, polaridad: "up-bad", destino: { ruta: "agente", params: { ref: "id-ventas", pestana: "tareas" } } }),
      ],
      serie: serie([5, 8, 0, 12, 9, 14, 12]),
      ultima_actividad: "2026-10-27T18:30:00Z",
      modulos: [
        {
          id: "pack_commerce",
          nombre: "Ventas",
          error: null,
          kpis: [k({ id: "pedidos", label: "Pedidos", valor: 2, destino: { ruta: "comercio.pedidos", params: {} } })],
        },
      ],
    },
    {
      ref: "general",
      key: "general",
      name: "General",
      kind: "specialist",
      kpis: [k({ id: "turnos", label: "Turnos atendidos", valor: 20, destino: { ruta: "agente", params: { ref: "general", pestana: "conversaciones" } } })],
      serie: serie([2, 3, 1, 4, 3, 4, 3]),
      ultima_actividad: "2026-10-27T17:10:00Z",
      modulos: [],
    },
    {
      ref: "id-cobranza",
      key: "cobranza",
      name: "Cobranza",
      kind: "specialist",
      kpis: [],
      serie: serie([0, 0, 0, 0, 0, 0, 0]),
      ultima_actividad: null,
      modulos: [{ id: "pack_cobranza", nombre: "Cobranza", kpis: [], error: "No se pudo cargar este módulo." }],
    },
    { ref: "id-vacio", key: "agenda", name: "Agenda", kind: "specialist", kpis: [], serie: [], ultima_actividad: null, modulos: [] },
  ],
};

describe("ResumenAgentes (ADR-0171)", () => {
  it("muestra el negocio, la evolución diaria y los módulos por agente", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getByRole("heading", { name: "Negocio" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Evolución diaria" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Módulos por agente" })).toBeTruthy();
    const modulo = screen.getByRole("region", { name: "Módulo Ventas" });
    expect(within(modulo).getByText("Pedidos")).toBeTruthy();
  });

  it("cada cifra enlaza a la pantalla que la explica", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const negocio = screen.getByRole("region", { name: "Negocio" });
    const hrefDe = (contenedor: HTMLElement, texto: string) =>
      within(contenedor).getByText(texto).closest("a")?.getAttribute("href");
    expect(hrefDe(negocio, "Conversaciones")).toBe("/conversaciones");
    expect(hrefDe(negocio, "Escalaciones pendientes")).toBe("/escalaciones");
    const modulos = screen.getByRole("region", { name: "Módulos por agente" });
    expect(hrefDe(modulos, "Tareas abiertas")).toBe("/agentes/id-ventas?tab=tareas");
    expect(hrefDe(modulos, "Pedidos")).toBe("/comercio/pedidos");
  });

  it("la tabla de actividad enlaza al agente y distingue al General", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const enlacesVentas = screen.getAllByRole("link", { name: "Ventas" });
    expect(enlacesVentas.some((a) => a.getAttribute("href")?.startsWith("/agentes/id-ventas"))).toBe(true);
    expect(screen.getByText("Coordinación y sin asignar")).toBeTruthy();
    expect(screen.getAllByText(/Sin actividad/).length).toBeGreaterThan(0);
  });

  it("el delta dice contra qué compara y el formulario de período está en la URL", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getByText(/\+100 % frente a los 7 días anteriores/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "15 días" }).getAttribute("href")).toBe("/dashboard?dias=15");
  });

  it("el selector de métrica cambia la serie de la gráfica sin recargar", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getByRole("group", { name: /Turnos por agente y día/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Conversaciones" }));
    expect(screen.getByRole("group", { name: /Conversaciones por agente y día/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Costo IA" }));
    expect(screen.getByRole("group", { name: /Costo IA por agente y día/ })).toBeTruthy();
  });

  it("un módulo que falló lo dice sin tumbar el resto; un agente sin nada no ocupa lugar", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getByRole("alert").textContent).toBe("No se pudo cargar este módulo.");
    const modulos = screen.getByRole("region", { name: "Módulos por agente" });
    expect(within(modulos).queryByText("Agenda")).toBeNull();
    // La tabla sí lista a todos los agentes configurados, aunque no tengan actividad.
    expect(screen.getByRole("link", { name: "Agenda" })).toBeTruthy();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = render(<ResumenAgentes datos={DATOS} />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
