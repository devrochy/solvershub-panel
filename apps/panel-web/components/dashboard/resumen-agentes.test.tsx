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
  general: {
    kpis: [
      k({ id: "conversaciones", label: "Conversaciones", valor: 40, previo: 20, delta_pct: 100, destino: { ruta: "conversaciones", params: {} } }),
      k({ id: "escalaciones_pendientes", label: "Escalaciones pendientes", valor: 2, polaridad: "up-bad", destino: { ruta: "escalaciones", params: {} } }),
    ],
    serie: serie([7, 11, 1, 16, 12, 18, 15]),
    // Módulos que ningún agente cubre: van en el bloque del negocio (ADR-0192).
    modulos_sin_agente: [{ id: "pack_calendar", nombre: "Agenda", error: null, kpis: [k({ id: "citas_hoy", label: "Citas de hoy", valor: 4 })] }],
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
    { ref: "id-coord", key: "coordinador", name: "Coordinador", kind: "core", kpis: [k({ id: "turnos", label: "Turnos atendidos", valor: 9 })], serie: serie([1, 1, 1, 2, 1, 1, 2]), ultima_actividad: null, modulos: [] },
    {
      ref: "id-cobranza",
      key: "cobranza",
      name: "Cobranza",
      kind: "backoffice",
      kpis: [],
      serie: serie([0, 0, 0, 0, 0, 0, 0]),
      ultima_actividad: null,
      modulos: [{ id: "pack_cobranza", nombre: "Cobranza", kpis: [], error: "No se pudo cargar este módulo." }],
    },
    { ref: "id-vacio", key: "agenda", name: "Agenda", kind: "specialist", kpis: [], serie: [], ultima_actividad: null, modulos: [] },
  ],
};

describe("ResumenAgentes (ADR-0171)", () => {
  it("ordena el Resumen en secciones: agente general, evolución diaria y agentes", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const titulos = ["Todo el negocio", "Evolución diaria", "Agentes"].map((n) => screen.getByRole("heading", { name: n }));
    // El orden del documento es el orden de lectura.
    titulos.slice(1).forEach((h, i) => {
      expect(titulos[i].compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  it("el agente general lleva la cifra principal con la tendencia del negocio", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const general = screen.getByRole("region", { name: "Todo el negocio" });
    expect(within(general).getByText("Conversaciones")).toBeTruthy();
    expect(within(general).getByRole("img", { name: /Conversaciones por día, últimos 7 días/ })).toBeTruthy();
    expect(within(general).getByText(/\+100 % frente a los 7 días anteriores/)).toBeTruthy();
  });

  it("los módulos sin agente piden mejorar el plan en vez de mostrar sus cifras", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const general = screen.getByRole("region", { name: "Todo el negocio" });
    expect(within(general).getByText("Módulos sin agente")).toBeTruthy();
    expect(within(general).getByText("Agenda")).toBeTruthy();
    expect(within(general).queryByText("Citas de hoy")).toBeNull();
    expect(within(general).getByRole("link", { name: "Mejorar mi plan" }).getAttribute("href")).toBe(
      "/plan?ver=planes",
    );
  });

  it("cada agente es una tarjeta plegable y solo la primera arranca abierta", () => {
    const { container } = render(<ResumenAgentes datos={DATOS} />);
    // `.group`: el detalle técnico de un módulo con error también es un `<details>`.
    const tarjetas = container.querySelectorAll("details.group");
    expect(tarjetas).toHaveLength(3);
    expect(Array.from(tarjetas).map((d) => (d as HTMLDetailsElement).open)).toEqual([true, false, false]);
  });

  it("no hay tarjeta del Coordinador; la insignia es solo del back-office", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const agentes = screen.getByRole("region", { name: "Agentes" });
    expect(within(agentes).queryByText("Coordinador")).toBeNull();
    expect(within(agentes).getAllByText("Back-office")).toHaveLength(1);
    expect(within(agentes).queryByText("Especialista")).toBeNull();
  });

  it("plegada resume el módulo en dos cifras y enlaza al agente; abierta enseña el módulo", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const ventas = screen.getByRole("link", { name: "Ver el agente Ventas" }).closest("details") as HTMLElement;
    expect(ventas.getAttribute("open")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Ver el agente Ventas" }).getAttribute("href")).toBe("/agentes/id-ventas");
    expect(within(ventas).getByRole("region", { name: "Módulo Ventas" })).toBeTruthy();
    // «Pedidos» aparece en el título plegado y en el módulo.
    expect(within(ventas).getAllByText("Pedidos").length).toBeGreaterThan(0);
  });

  it("cada cifra enlaza a la pantalla que la explica", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const general = screen.getByRole("region", { name: "Todo el negocio" });
    const hrefDe = (contenedor: HTMLElement, texto: string) =>
      within(contenedor).getByText(texto).closest("a")?.getAttribute("href");
    expect(hrefDe(general, "Conversaciones")).toBe("/conversaciones");
    expect(hrefDe(general, "Escalaciones pendientes")).toBe("/escalaciones");
    const agentes = screen.getByRole("region", { name: "Agentes" });
    expect(hrefDe(agentes, "Tareas abiertas")).toBe("/agentes/id-ventas?ver=tareas");
    expect(
      within(screen.getByRole("region", { name: "Módulo Ventas" })).getByText("Pedidos").closest("a")?.getAttribute("href"),
    ).toBe("/comercio/pedidos");
  });

  it("dice «Sin actividad» en el agente que no tuvo y muestra la última actividad del que sí", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getAllByText(/Sin actividad en el período/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Última actividad/).length).toBeGreaterThan(0);
  });

  it("la tabla «Actividad por agente» y el selector de período ya no están aquí", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("link", { name: "15 días" })).toBeNull();
  });

  it("el selector de métrica cambia la serie de la gráfica sin recargar", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getByRole("group", { name: /Respuestas por agente y día/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Conversaciones" }));
    expect(screen.getByRole("group", { name: /Conversaciones por agente y día/ })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Costo IA" }));
    expect(screen.getByRole("group", { name: /Costo IA por agente y día/ })).toBeTruthy();
  });

  it("un módulo que falló lo dice sin tumbar el resto", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const alerta = screen.getByRole("alert");
    expect(alerta.textContent).toContain("No pudimos cargar estas cifras");
    expect(alerta.querySelector("details")?.textContent).toContain("No se pudo cargar este módulo.");
  });

  it("tolera un backend sin la serie del negocio (aún no desplegado)", () => {
    const sinSerie = { ...DATOS, general: { kpis: DATOS.general.kpis } } as ResumenPorAgente;
    render(<ResumenAgentes datos={sinSerie} />);
    const general = screen.getByRole("region", { name: "Todo el negocio" });
    expect(within(general).queryByRole("img")).toBeNull();
    expect(within(general).getByText("Conversaciones")).toBeTruthy();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = render(<ResumenAgentes datos={DATOS} />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
