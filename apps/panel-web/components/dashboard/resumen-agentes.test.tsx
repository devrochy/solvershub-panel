// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import type { KpiResumen, ResumenPorAgente } from "@/lib/api/types";
import { violacionesGraves } from "@/lib/testing/axe";

import { ResumenAgentes } from "./resumen-agentes";

afterEach(cleanup);

function k(parcial: Partial<KpiResumen> & Pick<KpiResumen, "id" | "label">): KpiResumen {
  return { valor: 0, unidad: "count", previo: null, delta_pct: null, polaridad: "up-good", ...parcial };
}

const PERIODO = {
  desde: "2026-10-20T00:00:00Z",
  hasta: "2026-10-27T00:00:00Z",
  previo_desde: "2026-10-13T00:00:00Z",
  previo_hasta: "2026-10-20T00:00:00Z",
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
      kpis: [k({ id: "turnos", label: "Turnos atendidos", valor: 3, previo: 1, delta_pct: 200, destino: { ruta: "agente", params: { ref: "id-ventas", pestana: "tareas" } } })],
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
      ref: "id-cobranza",
      key: "cobranza",
      name: "Cobranza",
      kind: "specialist",
      kpis: [],
      modulos: [{ id: "pack_cobranza", nombre: "Cobranza", kpis: [], error: "No se pudo cargar este módulo." }],
    },
    { ref: "id-vacio", key: "agenda", name: "Agenda", kind: "specialist", kpis: [], modulos: [] },
  ],
};

describe("ResumenAgentes (ADR-0171)", () => {
  it("muestra el agente general y una tarjeta por agente con su módulo", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getByRole("heading", { name: "Agente general" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Agentes" })).toBeTruthy();
    const modulo = screen.getByRole("region", { name: "Módulo Ventas" });
    expect(within(modulo).getByText("Pedidos")).toBeTruthy();
  });

  it("cada cifra enlaza a la pantalla que la explica", () => {
    render(<ResumenAgentes datos={DATOS} />);
    const hrefDe = (texto: string) => screen.getByText(texto).closest("a")?.getAttribute("href");
    expect(hrefDe("Conversaciones")).toBe("/conversaciones");
    expect(hrefDe("Escalaciones pendientes")).toBe("/escalaciones");
    expect(hrefDe("Turnos atendidos")).toBe("/agentes/id-ventas?tab=tareas");
    expect(hrefDe("Pedidos")).toBe("/comercio/pedidos");
  });

  it("el nombre del agente enlaza a su pantalla y el delta dice contra qué compara", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getByRole("link", { name: "Ventas" }).getAttribute("href")).toBe("/agentes/id-ventas");
    expect(screen.getByText(/\+100 % frente a los 7 días anteriores/)).toBeTruthy();
  });

  it("un módulo que falló lo dice sin tumbar el resto; un agente sin nada que mostrar no ocupa lugar", () => {
    render(<ResumenAgentes datos={DATOS} />);
    expect(screen.getByRole("alert").textContent).toBe("No se pudo cargar este módulo.");
    expect(screen.queryByText("Agenda")).toBeNull();
  });

  it("no tiene violaciones graves de accesibilidad", async () => {
    const { container } = render(<ResumenAgentes datos={DATOS} />);
    expect(await violacionesGraves(container)).toEqual([]);
  });
});
